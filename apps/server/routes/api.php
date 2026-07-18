<?php

declare(strict_types=1);

use FangaBase\Http\Controllers\AuthController;
use FangaBase\Http\Controllers\SessionController;
use FangaBase\Http\Controllers\GoogleOAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/email/verification/request', [AuthController::class, 'requestVerification']);
    Route::post('/email/verification/confirm', [AuthController::class, 'confirmVerification']);
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);
    Route::post('/password/reset', [AuthController::class, 'resetPassword']);
    Route::middleware('strict.csrf')->group(function (): void {
        Route::post('/refresh', [SessionController::class, 'refresh']);
        Route::post('/logout', [SessionController::class, 'logout']);
        Route::post('/logout-all', [SessionController::class, 'logoutAll']);
    });
});

Route::get('/oauth/google/start', [GoogleOAuthController::class, 'start']);
Route::get('/oauth/google/callback', [GoogleOAuthController::class, 'callback']);

Route::get('/health', fn () => response()->json(['status' => 'ok', 'timestamp' => now()->toISOString()]));
Route::get('/readiness', function () {
    try {
        app('db')->connection()->getPdo();
        return response()->json(['status' => 'ok', 'timestamp' => now()->toISOString()]);
    } catch (Throwable) {
        return response()->json(['error' => ['code' => 'NOT_READY', 'message' => 'D?pendances obligatoires indisponibles']], 503);
    }
});
