<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Identity\GoogleOAuthService;
use FangaBase\Http\SessionCookieFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class GoogleOAuthController
{
    public function start(Request $request, GoogleOAuthService $oauth): RedirectResponse
    {
        $returnPath = $request->query('return_path', '/dashboard');

        return redirect()->away($oauth->start(is_string($returnPath) ? $returnPath : ''));
    }

    public function callback(Request $request, GoogleOAuthService $oauth, SessionCookieFactory $cookies): RedirectResponse
    {
        $input = $request->validate([
            'code' => ['required', 'string', 'max:4096'],
            'state' => ['required', 'string', 'max:256'],
        ]);
        $result = $oauth->callback($input['code'], $input['state']);
        $target = rtrim((string) config('fangabase.public_origin'), '/').$result['return_path'];
        $response = redirect()->away($target);
        foreach ($cookies->create($result['credentials']) as $cookie) {
            $response->withCookie($cookie);
        }

        return $response;
    }
}
