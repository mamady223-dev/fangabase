<?php

declare(strict_types=1);

use FangaBase\Http\Middleware\AuthenticateRefreshSession;
use FangaBase\Http\Middleware\HandleInertiaRequests;
use FangaBase\Http\Middleware\StrictDoubleSubmitCsrf;
use FangaBase\Support\ApiProblem;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->web(append: [HandleInertiaRequests::class]);
        $middleware->alias([
            'strict.csrf' => StrictDoubleSubmitCsrf::class,
            'session.auth' => AuthenticateRefreshSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (ApiProblem $problem) {
            $messages = [
                'AUTH_REQUIRED' => 'Authentification requise',
                'ACCOUNT_SUSPENDED' => 'Compte suspendu',
                'RATE_LIMITED' => 'Trop de tentatives',
                'ACCOUNT_EXISTS' => 'Compte deja existant',
                'TOKEN_INVALID' => 'Jeton invalide ou expire',
                'SESSION_REPLAY' => 'Reutilisation de session detectee',
                'CSRF_INVALID' => 'Protection CSRF invalide',
                'OAUTH_INVALID' => 'Connexion OAuth invalide',
                'PAYMENT_PROVIDER_NOT_CONFIGURED' => 'Fournisseur de paiement non configure',
                'PAYMENT_PROVIDER_CURRENCY_UNSUPPORTED' => 'Devise non prise en charge',
                'PAYMENT_PROVIDER_TIMEOUT' => 'Statut du paiement a verifier',
                'PAYMENT_PROVIDER_TEMPORARY' => 'Fournisseur temporairement indisponible',
                'PAYMENT_PROVIDER_REJECTED' => 'Requete de paiement refusee',
                'PAYMENT_PROVIDER_INVALID_RESPONSE' => 'Reponse fournisseur invalide',
            ];

            return response()->json([
                'error' => [
                    'code' => $problem->errorCode,
                    'message' => $messages[$problem->errorCode] ?? 'Requete refusee',
                ],
            ], $problem->status);
        });
    })->create();
