<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class EmailOutboxWorker
{
    public function __construct(private MailProviderRegistry $providers, private OutboxMailFactory $factory, private int $maxAttempts = 8, private int $leaseSeconds = 60) {}

    public function runOnce(int $limit = 25): int
    {
        $ids = DB::transaction(function () use ($limit): array {
            $now = now();
            $rows = DB::table('email_jobs')->where(function ($query) use ($now): void {
                $query->where(function ($pending) use ($now): void { $pending->where('status', 'PENDING')->where('available_at', '<=', $now); })
                    ->orWhere(function ($expired) use ($now): void { $expired->where('status', 'PROCESSING')->where('claimed_until', '<=', $now); });
            })->orderBy('available_at')->limit(max(1, min(100, $limit)))->lockForUpdate()->get();
            $ids = $rows->pluck('id')->all();
            if ($ids !== []) DB::table('email_jobs')->whereIn('id', $ids)->update(['status' => 'PROCESSING', 'claimed_until' => $now->copy()->addSeconds($this->leaseSeconds), 'updated_at' => $now]);
            return $ids;
        });
        foreach ($ids as $id) $this->deliver((string) $id);
        return count($ids);
    }

    public function replayDead(string $jobId, string $actorId, string $reason): bool
    {
        return DB::transaction(function () use ($jobId, $actorId, $reason): bool {
            $updated = DB::table('email_jobs')->where('id', $jobId)->where('status', 'DEAD')->update([
                'status' => 'PENDING', 'attempts' => 0, 'available_at' => now(), 'claimed_until' => null,
                'last_error_code' => null, 'dead_at' => null, 'updated_at' => now(),
            ]);
            if ($updated !== 1) return false;
            DB::table('audit_events')->insert([
                'id' => (string) Str::uuid(), 'actor_id' => $actorId, 'organization_id' => null,
                'action' => 'EMAIL_JOB_REPLAYED', 'target_type' => 'email_job', 'target_id' => $jobId,
                'reason' => mb_substr($reason, 0, 500), 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'occurred_at' => now(),
            ]);
            return true;
        });
    }

    private function deliver(string $id): void
    {
        $job = DB::table('email_jobs')->where('id', $id)->first();
        if ($job === null || $job->status !== 'PROCESSING') return;
        $payload = json_decode((string) $job->payload, true, flags: JSON_THROW_ON_ERROR);
        $provider = $this->providers->get((string) ($payload['provider'] ?? 'local'));
        $attempt = (int) $job->attempts + 1;
        try {
            $result = $provider === null ? MailDeliveryResult::permanent('PROVIDER_UNKNOWN') : $provider->send($this->factory->make((string) $job->type, $payload, (string) $job->idempotency_key));
        } catch (\Throwable) {
            $result = MailDeliveryResult::permanent('MAIL_PAYLOAD_INVALID');
        }
        DB::transaction(function () use ($job, $provider, $attempt, $result): void {
            $now = now();
            $terminal = !$result->retryable || $attempt >= $this->maxAttempts;
            $status = $result->delivered ? 'SENT' : ($terminal ? 'DEAD' : 'PENDING');
            $delay = $result->retryAfterSeconds ?? min(3600, (2 ** min(10, $attempt)) + random_int(0, 30));
            DB::table('email_jobs')->where('id', $job->id)->where('status', 'PROCESSING')->update([
                'status' => $status, 'attempts' => $attempt, 'claimed_until' => null,
                'available_at' => $status === 'PENDING' ? $now->copy()->addSeconds($delay) : $job->available_at,
                'last_error_code' => $result->delivered ? null : $result->code,
                'provider_message_id' => $result->providerMessageId,
                'sent_at' => $result->delivered ? $now : null, 'dead_at' => $status === 'DEAD' ? $now : null, 'updated_at' => $now,
            ]);
            DB::table('email_job_attempts')->insert([
                'id' => (string) Str::uuid(), 'email_job_id' => $job->id, 'attempt' => $attempt,
                'provider' => $provider?->name() ?? 'unknown', 'outcome' => $status,
                'safe_error_code' => $result->delivered ? null : $result->code,
                'provider_message_id' => $result->providerMessageId, 'occurred_at' => $now,
            ]);
        });
    }
}
