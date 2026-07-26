<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Identity\AuthenticatedAccountService;
use FangaBase\Http\SessionCookieFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountController
{
    use ResolvesActor;

    public function me(Request $request, AuthenticatedAccountService $accounts): JsonResponse
    {
        return response()->json(['user' => $accounts->current($this->actor($request))]);
    }

    public function changePassword(Request $request, AuthenticatedAccountService $accounts, SessionCookieFactory $cookies): JsonResponse
    {
        $input = $request->validate([
            'current_password' => ['required', 'string', 'max:128'],
            'new_password' => ['required', 'string', 'max:128'],
        ]);
        $accounts->changePassword($this->actor($request), $input['current_password'], $input['new_password']);

        $response = response()->json(['message' => 'Mot de passe modifie']);
        foreach ($cookies->clear() as $cookie) {
            $response->withCookie($cookie);
        }

        return $response;
    }
}
