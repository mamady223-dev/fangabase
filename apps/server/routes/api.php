<?php

declare(strict_types=1);

use FangaBase\Http\Controllers\AuthController;
use FangaBase\Http\Controllers\SessionController;
use FangaBase\Http\Controllers\GoogleOAuthController;
use FangaBase\Http\Controllers\OrganizationController;
use FangaBase\Http\Controllers\OrganizationInvitationController;
use FangaBase\Http\Controllers\OrganizationMembershipController;
use FangaBase\Http\Controllers\PlatformAdminController;
use FangaBase\Http\Controllers\BillingAdminController;
use FangaBase\Http\Controllers\BillingController;
use FangaBase\Http\Controllers\CatalogController;
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
Route::get('/catalog', [CatalogController::class, 'index']);

Route::middleware('session.auth')->group(function (): void {
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
    Route::get('/organizations/{organization}/members', [OrganizationMembershipController::class, 'index']);
    Route::get('/billing/summary', [BillingController::class, 'summary']);
    Route::get('/billing/credits', [BillingController::class, 'credits']);
    Route::get('/billing/subscription', [BillingController::class, 'subscription']);
    Route::get('/billing/entitlements', [BillingController::class, 'entitlements']);

    Route::middleware('strict.csrf')->group(function (): void {
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::patch('/organizations/{organization}', [OrganizationController::class, 'update']);
        Route::post('/organizations/{organization}/invitations', [OrganizationInvitationController::class, 'store']);
        Route::post('/organizations/{organization}/invitations/{token}/accept', [OrganizationInvitationController::class, 'accept']);
        Route::post('/organizations/{organization}/invitations/{token}/refuse', [OrganizationInvitationController::class, 'refuse']);
        Route::patch('/organizations/{organization}/members/{user}', [OrganizationMembershipController::class, 'update']);
        Route::delete('/organizations/{organization}/members/{user}', [OrganizationMembershipController::class, 'destroy']);
        Route::post('/organizations/{organization}/leave', [OrganizationMembershipController::class, 'leave']);
        Route::post('/billing/credits/purchase', [BillingController::class, 'purchaseCredits']);
        Route::post('/billing/subscriptions', [BillingController::class, 'createSubscription']);
        Route::post('/billing/subscriptions/{subscription}/cancel', [BillingController::class, 'cancel']);
    });

    Route::prefix('admin')->group(function (): void {
        Route::get('/users', [PlatformAdminController::class, 'users']);
        Route::get('/organizations', [PlatformAdminController::class, 'organizations']);
        Route::get('/billing/events', [BillingAdminController::class, 'events']);
        Route::middleware('strict.csrf')->group(function (): void {
            Route::patch('/users/{user}', [PlatformAdminController::class, 'updateUser']);
            Route::patch('/organizations/{organization}', [PlatformAdminController::class, 'updateOrganization']);
            Route::post('/catalog', [CatalogController::class, 'store']);
            Route::post('/catalog/prices/{price}/archive', [CatalogController::class, 'archive']);
            Route::post('/billing/credits/grant', [BillingAdminController::class, 'grant']);
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
