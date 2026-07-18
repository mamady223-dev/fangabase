<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Identity\PersistentRateLimiter;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

final class IdentityPersistenceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
    }

    public function test_rate_limit_attempts_are_persisted_under_a_hashed_scope(): void
    {
        $limiter = app(PersistentRateLimiter::class);

        $limiter->hit('login:person@example.test');

        $this->assertDatabaseHas('rate_limits', [
            'scope_hash' => hash('sha256', 'login:person@example.test'),
            'attempts' => 1,
        ]);
        $this->assertSame(1, DB::table('rate_limits')->count());
    }

    public function test_registration_and_login_use_persisted_credentials(): void
    {
        $registration = $this->postJson('/api/auth/register', [
            'email' => 'person@example.test',
            'password' => 'LongPassword42',
        ]);

        $registration->assertCreated()->assertJsonPath('user.email', 'person@example.test');
        $this->assertDatabaseHas('users', ['email' => 'person@example.test']);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'person@example.test',
            'password' => 'LongPassword42',
        ]);

        $login->assertOk()->assertJsonStructure(['user' => ['id', 'email'], 'refresh_token']);
        $this->assertDatabaseCount('refresh_sessions', 1);
    }

    public function test_invalid_login_does_not_expose_credential_details(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'missing@example.test',
            'password' => 'LongPassword42',
        ]);

        $response->assertUnauthorized()->assertExactJson([
            'error' => ['code' => 'AUTH_REQUIRED', 'message' => 'Authentification requise'],
        ]);
    }
}
