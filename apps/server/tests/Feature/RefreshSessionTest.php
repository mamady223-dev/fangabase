<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Identity\RefreshSessionService;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

final class RefreshSessionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
    }

    public function test_refresh_rotates_hashes_atomically(): void
    {
        [$refresh, $csrf] = $this->login('rotate@example.test');

        $response = $this->sessionRequest('/api/auth/refresh', $refresh, $csrf)->assertOk();
        $newRefresh = $this->cookieValue($response, 'fangabase_refresh');

        $this->assertNotSame($refresh, $newRefresh);
        $this->assertDatabaseHas('refresh_sessions', [
            'refresh_hash' => hash('sha256', $refresh),
        ]);
        $this->assertSame(1, DB::table('refresh_sessions')->whereNotNull('rotated_at')->count());
        $this->assertSame(1, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
    }

    public function test_replay_revokes_the_entire_family_and_replacement(): void
    {
        [$refresh, $csrf] = $this->login('replay@example.test');
        $rotated = $this->sessionRequest('/api/auth/refresh', $refresh, $csrf)->assertOk();
        $newRefresh = $this->cookieValue($rotated, 'fangabase_refresh');
        $newCsrf = $this->cookieValue($rotated, 'fangabase_csrf');

        $this->sessionRequest('/api/auth/refresh', $refresh, $csrf)
            ->assertUnauthorized()->assertJsonPath('error.code', 'SESSION_REPLAY');
        $this->assertSame(0, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
        $this->sessionRequest('/api/auth/refresh', $newRefresh, $newCsrf)->assertUnauthorized();
    }

    public function test_second_rotation_of_the_same_token_is_treated_as_concurrent_replay(): void
    {
        [$refresh, $csrf] = $this->login('concurrent@example.test');
        $sessions = app(RefreshSessionService::class);

        $sessions->rotate($refresh, $csrf);
        try {
            $sessions->rotate($refresh, $csrf);
            self::fail('Le replay concurrent aurait du etre refuse.');
        } catch (\FangaBase\Support\ApiProblem $problem) {
            self::assertSame('SESSION_REPLAY', $problem->errorCode);
        }
        self::assertSame(0, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
    }

    public function test_suspension_revokes_sessions(): void
    {
        [$refresh, $csrf] = $this->login('suspended@example.test');
        DB::table('users')->where('email', 'suspended@example.test')->update(['status' => 'SUSPENDED']);

        $this->sessionRequest('/api/auth/refresh', $refresh, $csrf)
            ->assertForbidden()->assertJsonPath('error.code', 'ACCOUNT_SUSPENDED');
        $this->assertSame(0, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
    }

    public function test_logout_current_revokes_only_that_session(): void
    {
        [$firstRefresh, $firstCsrf] = $this->login('logout@example.test');
        [$secondRefresh] = $this->loginExisting('logout@example.test');

        $this->sessionRequest('/api/auth/logout', $firstRefresh, $firstCsrf)->assertOk();

        $this->assertNotNull(DB::table('refresh_sessions')->where('refresh_hash', hash('sha256', $firstRefresh))->value('revoked_at'));
        $this->assertNull(DB::table('refresh_sessions')->where('refresh_hash', hash('sha256', $secondRefresh))->value('revoked_at'));
    }

    public function test_logout_all_revokes_every_session(): void
    {
        [$refresh, $csrf] = $this->login('logout-all@example.test');
        $this->loginExisting('logout-all@example.test');

        $this->sessionRequest('/api/auth/logout-all', $refresh, $csrf)->assertOk();
        $this->assertSame(0, DB::table('refresh_sessions')->whereNull('revoked_at')->count());
    }

    public function test_csrf_cookie_and_header_are_both_required_and_must_match(): void
    {
        [$refresh, $csrf] = $this->login('csrf@example.test');

        $this->withCredentials()->withUnencryptedCookie('fangabase_refresh', $refresh)->postJson('/api/auth/refresh')
            ->assertStatus(419)->assertJsonPath('error.code', 'CSRF_INVALID');
        $this->withCredentials()->withUnencryptedCookie('fangabase_refresh', $refresh)
            ->withUnencryptedCookie('fangabase_csrf', $csrf)
            ->withHeader('X-CSRF-TOKEN', str_repeat('f', 64))
            ->postJson('/api/auth/refresh')
            ->assertStatus(419);
    }

    public function test_expired_sessions_are_cleaned(): void
    {
        $this->login('cleanup@example.test');
        DB::table('refresh_sessions')->update(['expires_at' => now()->subSecond()]);

        self::assertSame(1, app(RefreshSessionService::class)->cleanupExpired());
        $this->assertDatabaseCount('refresh_sessions', 0);
    }

    /** @return array{string, string} */
    private function login(string $email): array
    {
        $this->postJson('/api/auth/register', ['email' => $email, 'password' => 'LongPassword42'])->assertCreated();

        return $this->loginExisting($email);
    }

    /** @return array{string, string} */
    private function loginExisting(string $email): array
    {
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'LongPassword42'])->assertOk();

        return [$this->cookieValue($response, 'fangabase_refresh'), $this->cookieValue($response, 'fangabase_csrf')];
    }

    private function sessionRequest(string $path, string $refresh, string $csrf): \Illuminate\Testing\TestResponse
    {
        return $this->withCredentials()->withUnencryptedCookie('fangabase_refresh', $refresh)
            ->withUnencryptedCookie('fangabase_csrf', $csrf)
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->postJson($path);
    }

    private function cookieValue(\Illuminate\Testing\TestResponse $response, string $name): string
    {
        $cookie = $response->getCookie($name, false);
        self::assertNotNull($cookie);

        return (string) $cookie->getValue();
    }
}
