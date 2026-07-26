<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class GenericUserFeaturesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
    }

    public function test_current_user_profile_and_password_change_are_persistent(): void
    {
        [$refresh, $csrf] = $this->login('account@example.test');

        $this->authenticated('GET', '/api/auth/me', $refresh, $csrf)
            ->assertOk()->assertJsonPath('user.email', 'account@example.test');
        $this->authenticated('PATCH', '/api/profile', $refresh, $csrf, ['name' => 'Compte', 'locale' => 'en'])
            ->assertOk()->assertJsonPath('user.name', 'Compte');
        $this->authenticated('POST', '/api/auth/password/change', $refresh, $csrf, [
            'current_password' => 'LongPassword42',
            'new_password' => 'ChangedPassword43',
        ])->assertOk()->assertCookieExpired('fangabase_refresh');
        $this->assertSame(0, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
        $this->postJson('/api/auth/login', ['email' => 'account@example.test', 'password' => 'ChangedPassword43'])->assertOk();
    }

    public function test_notifications_are_scoped_to_the_authenticated_user(): void
    {
        [$refresh, $csrf, $userId] = $this->login('notified@example.test');
        $otherId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $otherId, 'email' => 'other@example.test', 'role' => 'USER',
            'status' => 'ACTIVE', 'session_version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([$userId, $otherId] as $owner) {
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(), 'user_id' => $owner, 'type' => 'test',
                'payload' => json_encode(['message' => 'Safe'], JSON_THROW_ON_ERROR),
                'read_at' => null, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $this->authenticated('GET', '/api/notifications', $refresh, $csrf)
            ->assertOk()->assertJsonCount(1, 'data');
        $this->authenticated('GET', '/api/notifications/unread-count', $refresh, $csrf)
            ->assertOk()->assertJsonPath('count', 1);
    }

    /** @return array{string, string, string} */
    private function login(string $email): array
    {
        $registration = $this->postJson('/api/auth/register', ['email' => $email, 'password' => 'LongPassword42'])
            ->assertCreated();
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'LongPassword42'])
            ->assertOk();

        return [
            (string) $response->getCookie('fangabase_refresh', false)?->getValue(),
            (string) $response->getCookie('fangabase_csrf', false)?->getValue(),
            (string) $registration->json('user.id'),
        ];
    }

    private function authenticated(string $method, string $path, string $refresh, string $csrf, array $body = []): \Illuminate\Testing\TestResponse
    {
        return $this->withCredentials()
            ->withUnencryptedCookie('fangabase_refresh', $refresh)
            ->withUnencryptedCookie('fangabase_csrf', $csrf)
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->json($method, $path, $body);
    }
}
