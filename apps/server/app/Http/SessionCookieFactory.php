<?php

declare(strict_types=1);

namespace FangaBase\Http;

use FangaBase\Domain\Identity\SessionCredentials;

final class SessionCookieFactory
{
    /** @return array{\Symfony\Component\HttpFoundation\Cookie, \Symfony\Component\HttpFoundation\Cookie} */
    public function create(SessionCredentials $credentials): array
    {
        $secure = (bool) config('fangabase.cookie_secure');
        $sameSite = (string) config('fangabase.cookie_same_site', 'lax');
        return [
            cookie('fangabase_refresh', $credentials->refreshToken, $credentials->expiresInMinutes, '/api/auth', config('fangabase.cookie_domain'), $secure, true, false, $sameSite),
            cookie('fangabase_csrf', $credentials->csrfToken, $credentials->expiresInMinutes, '/', config('fangabase.cookie_domain'), $secure, false, false, $sameSite),
        ];
    }

    /** @return array{\Symfony\Component\HttpFoundation\Cookie, \Symfony\Component\HttpFoundation\Cookie} */
    public function clear(): array
    {
        return [
            cookie()->forget('fangabase_refresh', '/api/auth', config('fangabase.cookie_domain')),
            cookie()->forget('fangabase_csrf', '/', config('fangabase.cookie_domain')),
        ];
    }
}
