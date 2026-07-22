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
use FangaBase\Domain\Payments\MoneroWallet;
use FangaBase\Domain\Payments\PaymentProviderRegistry;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderHttpClient;
use FangaBase\Domain\Payments\WebhookVerifier;
use FangaBase\Infrastructure\Payments\FedaPayPaymentProvider;
use FangaBase\Infrastructure\Payments\LaravelPaymentHttpClient;
use FangaBase\Infrastructure\Payments\MoneroWalletRpc;
use FangaBase\Infrastructure\Payments\StripePaymentProvider;
use FangaBase\Infrastructure\Payments\StripeWebhookVerifier;
use FangaBase\Infrastructure\Payments\UnavailablePaymentProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(GoogleOAuthProvider::class, OfficialGoogleOAuthProvider::class);
        $this->app->bind(ProviderHttpClient::class, LaravelPaymentHttpClient::class);
        $this->app->singleton(PaymentProviderRegistry::class, function ($app): PaymentProviderRegistry {
            $http = $app->make(ProviderHttpClient::class);
            $blocked = fn (string $name, string $status): UnavailablePaymentProvider => new UnavailablePaymentProvider(new ProviderDescriptor($name, $status, [], [], []));
            return new PaymentProviderRegistry([
                new StripePaymentProvider($http, config('fangabase.payments.stripe.secret_key'), (bool) config('fangabase.payments.stripe.enabled')),
                new FedaPayPaymentProvider($http, config('fangabase.payments.fedapay.secret_key'), (bool) config('fangabase.payments.fedapay.enabled'), (string) config('fangabase.payments.fedapay.base_url')),
                $blocked('cinetpay', ProviderDescriptor::NEEDS_PROVIDER_CONTRACT), $blocked('paydunya', ProviderDescriptor::NEEDS_PROVIDER_CONTRACT),
                $blocked('orange_money', ProviderDescriptor::NEEDS_PROVIDER_CONTRACT), $blocked('bictorys', ProviderDescriptor::NEEDS_PROVIDER_CONTRACT),
                $blocked('paytech', ProviderDescriptor::NEEDS_PROVIDER_CONTRACT), $blocked('moneroo', ProviderDescriptor::NEEDS_PROVIDER_CONTRACT),
                $blocked('monero', ProviderDescriptor::DISABLED),
            ]);
        });
        $this->app->bind(WebhookVerifier::class, fn (): WebhookVerifier => new StripeWebhookVerifier((string) config('fangabase.payments.stripe.webhook_secret')));
        $this->app->bind(MoneroWallet::class, function (): MoneroWallet {
            $url = config('fangabase.payments.monero.wallet_rpc_url');
            if (! config('fangabase.payments.monero.enabled') || ! is_string($url) || $url === '') throw new \RuntimeException('MONERO_DISABLED');
            return new MoneroWalletRpc($url, config('fangabase.payments.monero.wallet_rpc_username'), config('fangabase.payments.monero.wallet_rpc_password'));
        });
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
