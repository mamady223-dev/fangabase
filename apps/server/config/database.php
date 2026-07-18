<?php

declare(strict_types=1);

return [
    'default' => env('DB_CONNECTION', 'sqlite'),
    'connections' => [
        'sqlite' => ['driver' => 'sqlite', 'database' => env('DB_DATABASE', database_path('database.sqlite')), 'prefix' => '', 'foreign_key_constraints' => true],
        'mysql' => ['driver' => 'mysql', 'host' => env('DB_HOST', '127.0.0.1'), 'port' => env('DB_PORT', '3306'), 'database' => env('DB_DATABASE', 'fangabase'), 'username' => env('DB_USERNAME', 'fangabase'), 'password' => env('DB_PASSWORD', ''), 'charset' => 'utf8mb4', 'collation' => 'utf8mb4_unicode_ci', 'strict' => true],
        'pgsql' => ['driver' => 'pgsql', 'host' => env('DB_HOST', '127.0.0.1'), 'port' => env('DB_PORT', '5432'), 'database' => env('DB_DATABASE', 'fangabase'), 'username' => env('DB_USERNAME', 'fangabase'), 'password' => env('DB_PASSWORD', ''), 'charset' => 'utf8', 'search_path' => 'public', 'sslmode' => env('DB_SSLMODE', 'prefer')],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
];
