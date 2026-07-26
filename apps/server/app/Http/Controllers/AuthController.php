<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Identity\LoginService;
use FangaBase\Domain\Identity\EmailVerificationService;
use FangaBase\Domain\Identity\PasswordResetService;
use FangaBase\Domain\Identity\RegistrationService;
use FangaBase\Domain\Identity\LocalIdentityMailProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use FangaBase\Http\SessionCookieFactory;

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

    public function login(Request $request, LoginService $login, SessionCookieFactory $cookies): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ]);

        $result = $login->login($input['email'], $input['password']);
        $response = response()->json(['user' => $result['user']]);
        foreach ($cookies->create($result['credentials']) as $cookie) {
            $response->withCookie($cookie);
        }

        return $response;
    }

    public function requestVerification(Request $request, EmailVerificationService $verification, LocalIdentityMailProvider $mail): JsonResponse
    {
        $input = $request->validate(['email' => ['required', 'string', 'email:rfc', 'max:254']]);
        $verification->request($input['email'], 'verify-email:'.$request->ip());

        $response = ['message' => 'Si le compte existe, un e-mail sera envoye'];
        if (app()->environment('testing') && $request->header('X-FangaBase-Conformance') === '1') {
            try {
                $response['verificationToken'] = $mail->latestToken($input['email'], 'VERIFY_EMAIL');
            } catch (\RuntimeException) {
                $response['verificationToken'] = null;
            }
        }

        return response()->json($response, 202);
    }

    public function confirmVerification(Request $request, EmailVerificationService $verification): JsonResponse
    {
        $input = $request->validate(['token' => ['required', 'string', 'size:64']]);
        $verification->confirm($input['token']);

        return response()->json(['message' => 'Adresse e-mail verifiee']);
    }

    public function forgotPassword(Request $request, PasswordResetService $passwordReset, LocalIdentityMailProvider $mail): JsonResponse
    {
        $input = $request->validate(['email' => ['required', 'string', 'email:rfc', 'max:254']]);
        $passwordReset->request($input['email'], 'forgot-password:'.$request->ip());

        $response = ['message' => 'Si le compte existe, un e-mail sera envoye'];
        if (app()->environment('testing') && $request->header('X-FangaBase-Conformance') === '1') {
            try {
                $response['resetToken'] = $mail->latestToken($input['email'], 'RESET_PASSWORD');
            } catch (\RuntimeException) {
                $response['resetToken'] = null;
            }
        }

        return response()->json($response, 202);
    }

    public function resetPassword(Request $request, PasswordResetService $passwordReset): JsonResponse
    {
        $input = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'max:128'],
        ]);
        $passwordReset->reset($input['token'], $input['password']);

        return response()->json(['message' => 'Mot de passe modifie']);
    }
}
