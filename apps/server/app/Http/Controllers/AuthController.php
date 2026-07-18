<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Identity\LoginService;
use FangaBase\Domain\Identity\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuthController
{
    public function register(Request $request, RegistrationService $registration): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string'],
        ]);

        return response()->json([
            'user' => $registration->register($input['email'], $input['password']),
        ], 201);
    }

    public function login(Request $request, LoginService $login): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ]);

        return response()->json($login->login($input['email'], $input['password']));
    }
}
