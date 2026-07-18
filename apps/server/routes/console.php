<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use FangaBase\Domain\Identity\RefreshSessionService;

Artisan::command('fangabase:doctor', function (): int {
    $this->line(json_encode(['php' => PHP_VERSION, 'environment' => app()->environment(), 'ok' => true], JSON_THROW_ON_ERROR));
    return self::SUCCESS;
})->purpose('Diagnostique le runtime FangaBase sans afficher de secret');

Artisan::command('fangabase:sessions:cleanup', function (RefreshSessionService $sessions): int {
    $this->line(json_encode(['deleted' => $sessions->cleanupExpired()], JSON_THROW_ON_ERROR));

    return self::SUCCESS;
})->purpose('Supprime les sessions de rafraichissement expirees');

Schedule::command('fangabase:sessions:cleanup')->daily()->withoutOverlapping();
