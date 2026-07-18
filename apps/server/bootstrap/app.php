<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use FangaBase\Support\ApiProblem;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (): bool => true);
        $exceptions->render(function (ApiProblem $problem) {
            $messages = [
                'AUTH_REQUIRED' => 'Authentification requise',
                'ACCOUNT_SUSPENDED' => 'Compte suspendu',
                'RATE_LIMITED' => 'Trop de tentatives',
                'ACCOUNT_EXISTS' => 'Compte deja existant',
            ];

            return response()->json([
                'error' => [
                    'code' => $problem->errorCode,
                    'message' => $messages[$problem->errorCode] ?? 'Requete refusee',
                ],
            ], $problem->status);
        });
    })->create();
