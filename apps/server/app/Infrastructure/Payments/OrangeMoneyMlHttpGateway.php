<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\OrangeMoneyMlGateway;
use FangaBase\Domain\Payments\ProviderHttpClient;

final readonly class OrangeMoneyMlHttpGateway implements OrangeMoneyMlGateway
{
    public function __construct(private ProviderHttpClient $http) {}

    public function oauth(array $configuration): array
    {
        $credentials = base64_encode($configuration['client_id'].':'.$configuration['client_secret']);
        $response = $this->safeRequest(fn (): array => $this->http->request(
            'POST',
            $configuration['oauth_token_url'],
            ['Authorization' => 'Basic '.$credentials, 'Accept' => 'application/json'],
            ['grant_type' => 'client_credentials'],
            'form',
            $configuration['timeout_seconds'],
        )->requireSuccess());

        if (! is_string($response['access_token'] ?? null) || $response['access_token'] === '') {
            throw new \RuntimeException('PAYMENT_PROVIDER_INVALID_RESPONSE');
        }

        return [
            'access_token' => $response['access_token'],
            'expires_in' => max(1, (int) ($response['expires_in'] ?? 300)),
        ];
    }

    public function checkout(array $configuration, string $accessToken, CheckoutRequest $request): array
    {
        return $this->http->request(
            'POST',
            rtrim($configuration['api_base_url'], '/').'/webpayment',
            ['Authorization' => 'Bearer '.$accessToken, 'Accept' => 'application/json'],
            [
                'merchant_key' => $configuration['merchant_key'],
                'merchant_account' => $configuration['merchant_account'],
                'merchant_code' => $configuration['merchant_code'],
                'currency' => $request->currency,
                'order_id' => $request->orderId,
                'amount' => $request->amountMinor,
                'return_url' => $configuration['return_url'],
                'cancel_url' => $configuration['cancel_url'],
                'notif_url' => $configuration['notification_url'],
                'reference' => $request->orderId,
            ],
            'json',
            $configuration['timeout_seconds'],
        )->requireSuccess();
    }

    public function status(array $configuration, string $accessToken, string $providerReference, array $context): array
    {
        return $this->safeRequest(fn (): array => $this->http->request(
            'POST',
            rtrim($configuration['api_base_url'], '/').'/transactionstatus',
            ['Authorization' => 'Bearer '.$accessToken, 'Accept' => 'application/json'],
            [
                'merchant_key' => $configuration['merchant_key'],
                'order_id' => $context['order_id'] ?? $providerReference,
                'amount' => $context['amount_minor'] ?? null,
                'pay_token' => $context['pay_token'] ?? null,
            ],
            'json',
            $configuration['timeout_seconds'],
        )->requireSuccess());
    }

    private function safeRequest(callable $request): array
    {
        for ($attempt = 0; $attempt < 2; $attempt++) {
            try {
                return $request();
            } catch (\RuntimeException $error) {
                if ($attempt === 1 || ! in_array($error->getMessage(), ['PAYMENT_PROVIDER_TIMEOUT', 'PAYMENT_PROVIDER_TEMPORARY'], true)) {
                    throw $error;
                }
                usleep(50_000 * (2 ** $attempt));
            }
        }

        throw new \RuntimeException('PAYMENT_PROVIDER_TEMPORARY');
    }
}
