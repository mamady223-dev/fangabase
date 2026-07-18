<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Infrastructure\Mail\EmailOutboxWorker;
use FangaBase\Domain\Infrastructure\Mail\MailProviderRegistry;
use FangaBase\Domain\Infrastructure\Mail\OutboxMailFactory;
use FangaBase\Infrastructure\Mail\LocalMailProvider;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EmailOutboxWorkerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_worker_sends_once_and_records_safe_history(): void
    {
        $jobId = $this->job('PENDING');
        $worker = $this->worker();
        self::assertSame(1, $worker->runOnce());
        self::assertSame('SENT', DB::table('email_jobs')->where('id', $jobId)->value('status'));
        self::assertSame(1, DB::table('email_job_attempts')->where('email_job_id', $jobId)->count());
        self::assertSame(0, $worker->runOnce());
        self::assertSame(1, DB::table('email_job_attempts')->where('email_job_id', $jobId)->count());
    }

    public function test_expired_lease_is_recovered(): void
    {
        $jobId = $this->job('PROCESSING', now()->subMinute());
        self::assertSame(1, $this->worker()->runOnce());
        self::assertSame('SENT', DB::table('email_jobs')->where('id', $jobId)->value('status'));
    }

    public function test_dead_replay_is_explicit_and_audited(): void
    {
        $userId = (string) Str::uuid();
        DB::table('users')->insert(['id' => $userId, 'email' => 'actor@example.test', 'created_at' => now(), 'updated_at' => now()]);
        $jobId = $this->job('DEAD');
        self::assertTrue($this->worker()->replayDead($jobId, $userId, 'configuration corrigée'));
        self::assertSame('PENDING', DB::table('email_jobs')->where('id', $jobId)->value('status'));
        self::assertSame(1, DB::table('audit_events')->where('target_id', $jobId)->where('action', 'EMAIL_JOB_REPLAYED')->count());
    }

    private function worker(): EmailOutboxWorker
    {
        return new EmailOutboxWorker(new MailProviderRegistry([new LocalMailProvider()]), new OutboxMailFactory('noreply@example.test', 'https://app.example.test'));
    }

    private function job(string $status, mixed $claimedUntil = null): string
    {
        $id = (string) Str::uuid();
        DB::table('email_jobs')->insert([
            'id' => $id, 'idempotency_key' => 'test:'.$id, 'type' => 'VERIFY_EMAIL',
            'payload' => json_encode(['recipient' => 'user@example.test', 'token_encrypted' => Crypt::encryptString('token'), 'provider' => 'local'], JSON_THROW_ON_ERROR),
            'status' => $status, 'attempts' => 0, 'available_at' => now()->subMinute(), 'claimed_until' => $claimedUntil,
            'dead_at' => $status === 'DEAD' ? now() : null, 'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }
}
