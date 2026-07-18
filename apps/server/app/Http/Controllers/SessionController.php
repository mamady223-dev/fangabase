<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Identity\RefreshSessionService;
use FangaBase\Http\SessionCookieFactory;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SessionController
{
    public function refresh(Request $request, RefreshSessionService $sessions, SessionCookieFactory $cookies): JsonResponse
    {
        $rotated = $sessions->rotate($this->refreshToken($request), (string) $request->cookie('fangabase_csrf'));
        $response = response()->json(['message' => 'Session actualisee']);
        foreach ($cookies->create($rotated['credentials']) as $cookie) {
            $response->withCookie($cookie);
        }

        return $response;
    }

    public function logout(Request $request, RefreshSessionService $sessions, SessionCookieFactory $cookies): JsonResponse
    {
        $sessions->logoutCurrent($this->refreshToken($request), (string) $request->cookie('fangabase_csrf'));

        return $this->clearedResponse($cookies);
    }

    public function logoutAll(Request $request, RefreshSessionService $sessions, SessionCookieFactory $cookies): JsonResponse
    {
        $sessions->logoutAll($this->refreshToken($request), (string) $request->cookie('fangabase_csrf'));

        return $this->clearedResponse($cookies);
    }

    private function refreshToken(Request $request): string
    {
        $token = $request->cookie('fangabase_refresh');
        if (! is_string($token) || $token === '') {
            throw ApiProblem::auth();
        }

        return $token;
    }

    private function clearedResponse(SessionCookieFactory $cookies): JsonResponse
    {
        $response = response()->json(['message' => 'Session fermee']);
        foreach ($cookies->clear() as $cookie) {
            $response->withCookie($cookie);
        }

        return $response;
    }
}
