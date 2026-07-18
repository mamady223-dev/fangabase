<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Identity\LocalIdentityMailProvider;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

final class IdentityRecoveryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
    }

    public function test_email_verification_succeeds_once(): void
    {
        $this->register('verified@example.test');
        $this->postJson('/api/auth/email/verification/request', ['email' => 'verified@example.test'])
            ->assertAccepted()->assertExactJson($this->accepted());

        $token = app(LocalIdentityMailProvider::class)->latestToken('verified@example.test', 'VERIFY_EMAIL');
        $this->postJson('/api/auth/email/verification/confirm', ['token' => $token])->assertOk();
        $this->assertNotNull(DB::table('users')->where('email', 'verified@example.test')->value('email_verified_at'));

        $this->postJson('/api/auth/email/verification/confirm', ['token' => $token])
            ->assertStatus(422)->assertJsonPath('error.code', 'TOKEN_INVALID');
    }

    public function test_expired_verification_token_is_rejected(): void
    {
        $this->register('expired@example.test');
        $this->postJson('/api/auth/email/verification/request', ['email' => 'expired@example.test']);
        $token = app(LocalIdentityMailProvider::class)->latestToken('expired@example.test', 'VERIFY_EMAIL');
        DB::table('verification_codes')->update(['expires_at' => now()->subSecond()]);

        $this->postJson('/api/auth/email/verification/confirm', ['token' => $token])
            ->assertStatus(422)->assertJsonPath('error.code', 'TOKEN_INVALID');
    }

    public function test_invalid_token_is_rejected_without_details(): void
    {
        $this->postJson('/api/auth/email/verification/confirm', ['token' => str_repeat('a', 64)])
            ->assertStatus(422)->assertExactJson([
                'error' => ['code' => 'TOKEN_INVALID', 'message' => 'Jeton invalide ou expire'],
            ]);
    }

    public function test_unknown_and_known_addresses_receive_the_same_response(): void
    {
        $this->register('known@example.test');

        $known = $this->postJson('/api/auth/password/forgot', ['email' => 'known@example.test']);
        $unknown = $this->postJson('/api/auth/password/forgot', ['email' => 'unknown@example.test']);

        $known->assertAccepted()->assertExactJson($this->accepted());
        $unknown->assertAccepted()->assertExactJson($this->accepted());
        $this->assertDatabaseCount('password_reset_codes', 1);
    }

    public function test_new_request_invalidates_the_previous_token(): void
    {
        $this->register('renewed@example.test');
        $this->postJson('/api/auth/password/forgot', ['email' => 'renewed@example.test']);
        $first = app(LocalIdentityMailProvider::class)->latestToken('renewed@example.test', 'RESET_PASSWORD');
        $this->postJson('/api/auth/password/forgot', ['email' => 'renewed@example.test']);
        $second = app(LocalIdentityMailProvider::class)->latestToken('renewed@example.test', 'RESET_PASSWORD');

        $this->postJson('/api/auth/password/reset', ['token' => $first, 'password' => 'AnotherPassword42'])
            ->assertStatus(422);
        $this->postJson('/api/auth/password/reset', ['token' => $second, 'password' => 'AnotherPassword42'])
            ->assertOk();
    }

    public function test_password_reset_revokes_sessions_and_token_reuse(): void
    {
        $this->register('reset@example.test');
        $this->postJson('/api/auth/login', ['email' => 'reset@example.test', 'password' => 'LongPassword42']);
        $this->postJson('/api/auth/password/forgot', ['email' => 'reset@example.test']);
        $token = app(LocalIdentityMailProvider::class)->latestToken('reset@example.test', 'RESET_PASSWORD');

        $this->postJson('/api/auth/password/reset', ['token' => $token, 'password' => 'ChangedPassword42'])
            ->assertOk();
        $this->assertSame(0, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
        $this->postJson('/api/auth/password/reset', ['token' => $token, 'password' => 'ChangedAgain42'])
            ->assertStatus(422);
        $this->postJson('/api/auth/login', ['email' => 'reset@example.test', 'password' => 'ChangedPassword42'])
            ->assertOk();
    }

    public function test_repeated_requests_are_persistently_limited(): void
    {
        $this->register('limited@example.test');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/password/forgot', ['email' => 'limited@example.test'])->assertAccepted();
        }

        $this->postJson('/api/auth/password/forgot', ['email' => 'limited@example.test'])
            ->assertStatus(429)->assertJsonPath('error.code', 'RATE_LIMITED');
        $this->assertDatabaseHas('rate_limits', ['attempts' => 5]);
    }

    private function register(string $email): void
    {
        $this->postJson('/api/auth/register', ['email' => $email, 'password' => 'LongPassword42'])
            ->assertCreated();
    }

    /** @return array{message: string} */
    private function accepted(): array
    {
        return ['message' => 'Si le compte existe, un e-mail sera envoye'];
    }
}
