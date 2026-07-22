<?php

declare(strict_types=1);

$origins = array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ORIGINS', 'http://localhost:3000')))));

if (in_array('*', $origins, true)) {
    throw new LogicException('CORS_ORIGINS must contain explicit origins when credentials are enabled.');
}

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'Origin', 'X-CSRF-TOKEN', 'X-Request-ID', 'Idempotency-Key'],
    'exposed_headers' => ['X-Request-ID'],
    'max_age' => 600,
    'supports_credentials' => true,
];
