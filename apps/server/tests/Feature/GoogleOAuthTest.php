<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Identity\GoogleIdentity;
use FangaBase\Domain\Identity\GoogleOAuthProvider;
use FangaBase\Support\ApiProblem;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

final class GoogleOAuthTest extends TestCase
{
    private FakeGoogleOAuthProvider $google;

    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
        config()->set('fangabase.google.client_id', 'test-google-client');
        $this->google = new FakeGoogleOAuthProvider();
        $this->app->instance(GoogleOAuthProvider::class, $this->google);
    }

    public function test_pkce_state_nonce_and_successful_link_are_enforced(): void
    {
        [$state, $location] = $this->start('/dashboard');
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        self::assertSame('S256', $query['code_challenge_method']);
        self::assertSame(43, strlen((string) $query['code_challenge']));
        $this->assertDatabaseHas('oauth_login_states', ['state_hash' => hash('sha256', $state)]);
        $this->assertDatabaseMissing('oauth_login_states', ['state_hash' => $state]);

        $response = $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($state));
        $response->assertRedirect('http://localhost:3000/dashboard');
        $response->assertCookie('fangabase_refresh')->assertCookie('fangabase_csrf');
        $this->assertDatabaseHas('users', ['email' => 'oauth@example.test']);
        $this->assertDatabaseHas('oauth_accounts', ['provider' => 'google', 'provider_subject' => 'google-subject']);
    }

    public function test_oauth_state_is_single_use_and_expiring(): void
    {
        [$usedState] = $this->start('/dashboard');
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($usedState))->assertRedirect();
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($usedState))
            ->assertUnauthorized()->assertJsonPath('error.code', 'OAUTH_INVALID');

        [$expiredState] = $this->start('/dashboard');
        DB::table('oauth_login_states')->where('state_hash', hash('sha256', $expiredState))->update(['expires_at' => now()->subSecond()]);
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($expiredState))
            ->assertUnauthorized();
    }

    public function test_external_return_path_is_rejected_before_redirect(): void
    {
        $this->get('/api/oauth/google/start?return_path='.urlencode('https://evil.example/steal'))
            ->assertUnauthorized()->assertJsonPath('error.code', 'OAUTH_INVALID');
        $this->assertDatabaseCount('oauth_login_states', 0);
    }

    public function test_unverified_email_and_invalid_claims_are_rejected(): void
    {
        $this->google->emailVerified = false;
        [$state] = $this->start('/dashboard');
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($state))
            ->assertUnauthorized()->assertJsonPath('error.code', 'OAUTH_INVALID');

        $this->google->emailVerified = true;
        $this->google->issuer = 'https://attacker.example';
        [$issuerState] = $this->start('/dashboard');
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($issuerState))->assertUnauthorized();
    }

    public function test_nonce_audience_and_expiration_are_validated(): void
    {
        $this->google->wrongNonce = true;
        [$nonceState] = $this->start('/dashboard');
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($nonceState))->assertUnauthorized();

        $this->google->wrongNonce = false;
        $this->google->audience = 'another-client';
        [$audienceState] = $this->start('/dashboard');
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($audienceState))->assertUnauthorized();

        $this->google->audience = 'test-google-client';
        $this->google->expiresAt = 1;
        [$expiredState] = $this->start('/dashboard');
        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($expiredState))->assertUnauthorized();
    }

    public function test_verified_google_identity_links_to_existing_account(): void
    {
        $this->postJson('/api/auth/register', ['email' => 'oauth@example.test', 'password' => 'LongPassword42'])->assertCreated();
        $userId = DB::table('users')->where('email', 'oauth@example.test')->value('id');
        [$state] = $this->start('/dashboard');

        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($state))->assertRedirect();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('oauth_accounts', ['user_id' => $userId, 'provider_subject' => 'google-subject']);
        $this->assertNotNull(DB::table('users')->where('id', $userId)->value('email_verified_at'));
    }

    public function test_suspended_account_cannot_use_google(): void
    {
        $this->postJson('/api/auth/register', ['email' => 'oauth@example.test', 'password' => 'LongPassword42'])->assertCreated();
        DB::table('users')->where('email', 'oauth@example.test')->update(['status' => 'SUSPENDED']);
        [$state] = $this->start('/dashboard');

        $this->get('/api/oauth/google/callback?code=valid-code&state='.urlencode($state))
            ->assertForbidden()->assertJsonPath('error.code', 'ACCOUNT_SUSPENDED');
        $this->assertDatabaseCount('oauth_accounts', 0);
    }

    /** @return array{string, string} */
    private function start(string $returnPath): array
    {
        $response = $this->get('/api/oauth/google/start?return_path='.urlencode($returnPath))->assertRedirect();
        $location = (string) $response->headers->get('Location');
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        return [(string) $query['state'], $location];
    }
}

final class FakeGoogleOAuthProvider implements GoogleOAuthProvider
{
    public bool $emailVerified = true;
    public bool $wrongNonce = false;
    public string $issuer = 'https://accounts.google.com';
    public string $audience = 'test-google-client';
    public int $expiresAt;
    private string $nonce = '';
    private string $challenge = '';

    public function __construct()
    {
        $this->expiresAt = time() + 3600;
    }

    public function authorizationUrl(string $state, string $nonce, string $codeChallenge): string
    {
        $this->nonce = $nonce;
        $this->challenge = $codeChallenge;

        return 'https://accounts.google.test/auth?'.http_build_query([
            'state' => $state,
            'nonce' => $nonce,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]);
    }

    public function exchange(string $code, string $codeVerifier, string $expectedNonceHash): GoogleIdentity
    {
        $calculated = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');
        if ($code !== 'valid-code' || ! hash_equals($this->challenge, $calculated) || ! hash_equals($expectedNonceHash, hash('sha256', $this->nonce))) {
            throw ApiProblem::oauthInvalid();
        }
        $nonce = $this->wrongNonce ? 'wrong-nonce' : $this->nonce;

        return new GoogleIdentity(
            'google-subject',
            'oauth@example.test',
            $this->emailVerified,
            $nonce,
            $this->issuer,
            $this->audience,
            $this->expiresAt,
        );
    }
}
