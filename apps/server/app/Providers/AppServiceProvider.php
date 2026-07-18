<?php

declare(strict_types=1);

namespace FangaBase\Providers;

use FangaBase\Domain\Identity\GoogleOAuthProvider;
use FangaBase\Infrastructure\Identity\OfficialGoogleOAuthProvider;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(GoogleOAuthProvider::class, OfficialGoogleOAuthProvider::class);
    }
}
