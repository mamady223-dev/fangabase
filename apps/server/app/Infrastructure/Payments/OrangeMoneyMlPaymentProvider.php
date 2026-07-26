<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\OrangeMoneyMlGateway;
use FangaBase\Domain\Payments\PaymentProvider;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderPayment;
use FangaBase\Domain\Payments\ProviderRefund;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

final readonly class OrangeMoneyMlPaymentProvider implements PaymentProvider
{
    public function __construct(private OrangeMoneyMlGateway $gateway, private array $configuration) {}

    public function descriptor(): ProviderDescriptor
    {
        $status = $this->configuration['enabled']
            ? ProviderDescriptor::IMPLEMENTED_NEEDS_SANDBOX_UAT
            : ProviderDescriptor::DISABLED;

        return new ProviderDescriptor(
            'orange_money_ml',
            $status,
            ['ONE_TIME_PAYMENT', 'MOBILE_MONEY', 'HOSTED_CHECKOUT', 'REDIRECT', 'ASYNCHRONOUS_CONFIRMATION', 'STATUS'],
            ['XOF'],
            ['ML'],
        );
    }

    public function createCheckout(CheckoutRequest $request): ProviderPayment
    {
        $this->assertConfigured();
        if ($request->currency !== 'XOF') {
            throw new \RuntimeException('PAYMENT_PROVIDER_CURRENCY_UNSUPPORTED');
        }

        $response = $this->gateway->checkout($this->configuration, $this->token(), $request);
        $reference = $this->required($response, 'reference', 'order_id');
        $checkoutUrl = $this->required($response, 'payment_url', 'paymentUrl', 'url');
        $secrets = array_filter([
            'pay_token' => $response['pay_token'] ?? $response['payToken'] ?? null,
            'notif_token' => $response['notif_token'] ?? $response['notifToken'] ?? null,
        ], fn (mixed $value): bool => is_string($value) && $value !== '');

        return new ProviderPayment(
            $reference,
            $this->normalize($response['status'] ?? null),
            $checkoutUrl,
            $request->amountMinor,
            'XOF',
            [
                'order_id' => $request->orderId,
                'amount_minor' => $request->amountMinor,
                'currency' => 'XOF',
                'encrypted_tokens' => $secrets === [] ? null : Crypt::encryptString(json_encode($secrets, JSON_THROW_ON_ERROR)),
            ],
        );
    }

    public function paymentStatus(string $providerReference, array $context = []): ProviderPayment
    {
        $this->assertConfigured();
        $encrypted = $context['encrypted_tokens'] ?? null;
        if (is_string($encrypted) && $encrypted !== '') {
            $tokens = json_decode(Crypt::decryptString($encrypted), true, flags: JSON_THROW_ON_ERROR);
            if (is_array($tokens)) {
                $context = [...$context, ...$tokens];
            }
        }
        unset($context['encrypted_tokens']);
        $response = $this->gateway->status($this->configuration, $this->token(), $providerReference, $context);

        return new ProviderPayment(
            (string) ($response['reference'] ?? $providerReference),
            $this->normalize($response['status'] ?? null),
            null,
            isset($response['amount']) ? (int) $response['amount'] : null,
            isset($response['currency']) ? strtoupper((string) $response['currency']) : null,
        );
    }

    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund
    {
        throw new \RuntimeException('PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED');
    }

    private function token(): string
    {
        $cacheKey = 'fangabase:orange-money-ml:oauth:'.hash('sha256', (string) $this->configuration['client_id']);
        $cached = Cache::get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            return Crypt::decryptString($cached);
        }
        $oauth = $this->gateway->oauth($this->configuration);
        $ttl = max(1, $oauth['expires_in'] - min(60, max(1, intdiv($oauth['expires_in'], 10))));
        Cache::put($cacheKey, Crypt::encryptString($oauth['access_token']), $ttl);

        return $oauth['access_token'];
    }

    private function assertConfigured(): void
    {
        if (! $this->configuration['enabled']) {
            throw new \RuntimeException('PAYMENT_PROVIDER_NOT_CONFIGURED');
        }
        if ($this->configuration['environment'] === 'simulator') {
            return;
        }
        foreach (['oauth_token_url', 'api_base_url', 'client_id', 'client_secret', 'merchant_account', 'merchant_code', 'merchant_key', 'return_url', 'cancel_url', 'notification_url'] as $key) {
            if (! is_string($this->configuration[$key] ?? null) || trim($this->configuration[$key]) === '') {
                throw new \RuntimeException('PAYMENT_PROVIDER_NOT_CONFIGURED');
            }
        }
    }

    private function normalize(mixed $status): string
    {
        return match (strtoupper((string) $status)) {
            'SUCCESS', 'SUCCESSFUL', 'SUCCEEDED', 'PAID', 'OK' => 'SUCCEEDED',
            'FAILED', 'FAIL', 'ERROR' => 'FAILED',
            'CANCELLED', 'CANCELED', 'CANCEL', 'ABORTED' => 'CANCELLED',
            'EXPIRED' => 'EXPIRED',
            'PROCESSING', 'INITIATED' => 'PROCESSING',
            'PENDING', '' => 'PENDING',
            default => 'NEEDS_REVIEW',
        };
    }

    private function required(array $response, string ...$keys): string
    {
        foreach ($keys as $key) {
            if (is_string($response[$key] ?? null) && $response[$key] !== '') {
                return $response[$key];
            }
        }
        throw new \RuntimeException('PAYMENT_PROVIDER_INVALID_RESPONSE');
    }
}
