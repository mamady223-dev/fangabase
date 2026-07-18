<?php

declare(strict_types=1);

return [
    'public_origin' => env('PUBLIC_ORIGIN', 'http://localhost:3000'),
    'cookie_domain' => env('COOKIE_DOMAIN'),
    'cookie_secure' => env('APP_ENV') === 'production',
    'cookie_same_site' => env('COOKIE_SAME_SITE', 'lax'),
    'session_minutes' => (int) env('SESSION_MINUTES', 30),
    'refresh_days' => (int) env('REFRESH_DAYS', 30),
    'verification_minutes' => (int) env('VERIFICATION_MINUTES', 15),
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI'),
    ],
];
