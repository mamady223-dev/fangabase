<?php

declare(strict_types=1);

namespace FangaBase\Providers;

use FangaBase\Domain\Identity\GoogleOAuthProvider;
use FangaBase\Infrastructure\Identity\OfficialGoogleOAuthProvider;
use FangaBase\Domain\Infrastructure\Mail\EmailOutboxWorker;
use FangaBase\Domain\Infrastructure\Mail\MailProviderRegistry;
use FangaBase\Domain\Infrastructure\Mail\OutboxMailFactory;
use FangaBase\Infrastructure\Mail\BrevoMailProvider;
use FangaBase\Infrastructure\Mail\LaravelProviderHttpClient;
use FangaBase\Infrastructure\Mail\LocalMailProvider;
use FangaBase\Infrastructure\Mail\ResendMailProvider;
use FangaBase\Infrastructure\Mail\SmtpMailProvider;
use FangaBase\Infrastructure\Mail\SymfonySmtpTransport;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(GoogleOAuthProvider::class, OfficialGoogleOAuthProvider::class);
        $this->app->singleton(LaravelProviderHttpClient::class);
        $this->app->singleton(MailProviderRegistry::class, function ($app): MailProviderRegistry {
            $http = $app->make(LaravelProviderHttpClient::class);
            $smtpDsn = config('fangabase.mail.smtp_dsn');
            return new MailProviderRegistry([
                new LocalMailProvider(),
                new ResendMailProvider($http, config('fangabase.mail.resend_api_key')),
                new BrevoMailProvider($http, config('fangabase.mail.brevo_api_key')),
                new SmtpMailProvider(is_string($smtpDsn) && $smtpDsn !== '' ? new SymfonySmtpTransport($smtpDsn) : null),
            ]);
        });
        $this->app->singleton(EmailOutboxWorker::class, fn ($app): EmailOutboxWorker => new EmailOutboxWorker(
            $app->make(MailProviderRegistry::class),
            new OutboxMailFactory((string) config('fangabase.mail.sender'), (string) config('fangabase.public_origin')),
            (int) config('fangabase.mail.max_attempts'),
            (int) config('fangabase.mail.lease_seconds'),
        ));
    }
}
