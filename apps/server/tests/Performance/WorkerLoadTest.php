<?php

declare(strict_types=1);

namespace FangaBase\Tests\Performance;

use FangaBase\Domain\Infrastructure\Mail\EmailOutboxWorker;
use FangaBase\Domain\Infrastructure\Mail\MailProviderRegistry;
use FangaBase\Domain\Infrastructure\Mail\OutboxMailFactory;
use FangaBase\Infrastructure\Mail\LocalMailProvider;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WorkerLoadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_two_workers_drain_bounded_load_and_recover_an_expired_lease_once(): void
    {
        for ($index = 0; $index < 100; $index++) {
            $this->insertJob('PENDING', null, $index);
        }
        $this->insertJob('PROCESSING', now()->subMinute(), 100);

        $first = $this->worker();
        $second = $this->worker();
        $processed = 0;
        for ($round = 0; $round < 6; $round++) {
            $processed += $first->runOnce(10);
            $processed += $second->runOnce(10);
        }

        self::assertSame(101, $processed);
        self::assertSame(101, DB::table('email_jobs')->where('status', 'SENT')->count());
        self::assertSame(101, DB::table('email_job_attempts')->count());
        self::assertSame(0, $first->runOnce(100));
        self::assertSame(101, DB::table('email_job_attempts')->count());
    }

    private function worker(): EmailOutboxWorker
    {
        return new EmailOutboxWorker(
            new MailProviderRegistry([new LocalMailProvider()]),
            new OutboxMailFactory('noreply@example.test', 'https://app.example.test'),
        );
    }

    private function insertJob(string $status, mixed $claimedUntil, int $index): void
    {
        $id = (string) Str::uuid();
        DB::table('email_jobs')->insert([
            'id' => $id,
            'idempotency_key' => 'load:'.$index.':'.$id,
            'type' => 'VERIFY_EMAIL',
            'payload' => json_encode([
                'recipient' => 'load-'.$index.'@example.test',
                'token_encrypted' => Crypt::encryptString('token-'.$index),
                'provider' => 'local',
            ], JSON_THROW_ON_ERROR),
            'status' => $status,
            'attempts' => 0,
            'available_at' => now()->subMinute(),
            'claimed_until' => $claimedUntil,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
