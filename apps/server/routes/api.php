<?php

declare(strict_types=1);

use FangaBase\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::get('/health', fn () => response()->json(['status' => 'ok', 'timestamp' => now()->toISOString()]));
Route::get('/readiness', function () {
    try {
        app('db')->connection()->getPdo();
        return response()->json(['status' => 'ok', 'timestamp' => now()->toISOString()]);
    } catch (Throwable) {
        return response()->json(['error' => ['code' => 'NOT_READY', 'message' => 'D?pendances obligatoires indisponibles']], 503);
    }
});
