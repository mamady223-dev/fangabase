<?php

declare(strict_types=1);

use FangaBase\Http\Controllers\AuthController;
use FangaBase\Http\Controllers\SessionController;
use FangaBase\Http\Controllers\GoogleOAuthController;
use FangaBase\Http\Controllers\OrganizationController;
use FangaBase\Http\Controllers\OrganizationInvitationController;
use FangaBase\Http\Controllers\OrganizationMembershipController;
use FangaBase\Http\Controllers\PlatformAdminController;
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

Route::middleware('session.auth')->group(function (): void {
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
    Route::get('/organizations/{organization}/members', [OrganizationMembershipController::class, 'index']);

    Route::middleware('strict.csrf')->group(function (): void {
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::patch('/organizations/{organization}', [OrganizationController::class, 'update']);
        Route::post('/organizations/{organization}/invitations', [OrganizationInvitationController::class, 'store']);
        Route::post('/organizations/{organization}/invitations/{token}/accept', [OrganizationInvitationController::class, 'accept']);
        Route::post('/organizations/{organization}/invitations/{token}/refuse', [OrganizationInvitationController::class, 'refuse']);
        Route::patch('/organizations/{organization}/members/{user}', [OrganizationMembershipController::class, 'update']);
        Route::delete('/organizations/{organization}/members/{user}', [OrganizationMembershipController::class, 'destroy']);
        Route::post('/organizations/{organization}/leave', [OrganizationMembershipController::class, 'leave']);
    });

    Route::prefix('admin')->group(function (): void {
        Route::get('/users', [PlatformAdminController::class, 'users']);
        Route::get('/organizations', [PlatformAdminController::class, 'organizations']);
        Route::middleware('strict.csrf')->group(function (): void {
            Route::patch('/users/{user}', [PlatformAdminController::class, 'updateUser']);
            Route::patch('/organizations/{organization}', [PlatformAdminController::class, 'updateOrganization']);
        });
    });
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
