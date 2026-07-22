<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Identity\SessionCredentials;
use FangaBase\Http\SessionCookieFactory;
use FangaBase\Tests\TestCase;

final class FrontendSecurityTest extends TestCase
{
    public function testCorsAllowsOnlyTheConfiguredCredentialedOrigin(): void
    {
        config()->set('cors.allowed_origins', ['https://student.example']);

        $this->call('OPTIONS', '/api/health', [], [], [], [
            'HTTP_ORIGIN' => 'https://student.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ])->assertHeader('Access-Control-Allow-Origin', 'https://student.example')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');

        $this->call('OPTIONS', '/api/health', [], [], [], [
            'HTTP_ORIGIN' => 'https://attacker.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ])->assertHeader('Access-Control-Allow-Origin', 'https://student.example');
    }

    public function testProductionRefreshCookieIsSecureHttpOnlyAndSameSiteNone(): void
    {
        config()->set('fangabase.cookie_secure', true);
        config()->set('fangabase.cookie_same_site', 'none');
        [$refresh, $csrf] = (new SessionCookieFactory())->create(new SessionCredentials('refresh', 'csrf', 30));

        self::assertTrue($refresh->isSecure());
        self::assertTrue($refresh->isHttpOnly());
        self::assertSame('none', $refresh->getSameSite());
        self::assertTrue($csrf->isSecure());
        self::assertFalse($csrf->isHttpOnly());
    }
}
