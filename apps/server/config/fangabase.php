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
    'password_reset_minutes' => (int) env('PASSWORD_RESET_MINUTES', 15),
    'mail_provider' => env('MAIL_PROVIDER', 'local'),
    'mail' => [
        'sender' => env('MAIL_FROM_ADDRESS', 'noreply@localhost'),
        'resend_api_key' => env('RESEND_API_KEY'),
        'brevo_api_key' => env('BREVO_API_KEY'),
        'smtp_dsn' => env('SMTP_DSN'),
        'max_attempts' => (int) env('MAIL_MAX_ATTEMPTS', 8),
        'lease_seconds' => (int) env('MAIL_LEASE_SECONDS', 60),
    ],
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI'),
        'state_minutes' => (int) env('GOOGLE_STATE_MINUTES', 10),
        'allowed_return_paths' => array_values(array_filter(explode(',', (string) env('GOOGLE_ALLOWED_RETURN_PATHS', '/,/dashboard')))),
    ],
];
