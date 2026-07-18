<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;

Artisan::command('fangabase:doctor', function (): int {
    $this->line(json_encode(['php' => PHP_VERSION, 'environment' => app()->environment(), 'ok' => true], JSON_THROW_ON_ERROR));
    return self::SUCCESS;
})->purpose('Diagnostique le runtime FangaBase sans afficher de secret');
