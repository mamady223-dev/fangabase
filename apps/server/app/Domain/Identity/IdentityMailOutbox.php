<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class IdentityMailOutbox
{
    public function enqueue(string $type, string $userId, string $email, string $token): void
    {
        $jobId = (string) Str::uuid();
        $now = now();
        $payload = [
            'recipient' => $email,
            'token_encrypted' => Crypt::encryptString($token),
            'provider' => config('fangabase.mail_provider', 'local'),
        ];

        DB::transaction(function () use ($jobId, $type, $userId, $email, $payload, $now): void {
            DB::table('email_jobs')->insert([
                'id' => $jobId,
                'idempotency_key' => 'identity:'.$type.':'.$jobId,
                'type' => $type,
                'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
                'status' => 'PENDING',
                'attempts' => 0,
                'available_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('outbox_events')->insert([
                'id' => (string) Str::uuid(),
                'idempotency_key' => 'identity-mail:'.$jobId,
                'type' => 'IDENTITY_MAIL_QUEUED',
                'payload' => json_encode([
                    'job_id' => $jobId,
                    'user_id' => $userId,
                    'recipient_hash' => hash('sha256', strtolower($email)),
                    'mail_type' => $type,
                ], JSON_THROW_ON_ERROR),
                'status' => 'PENDING',
                'attempts' => 0,
                'available_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }
}
