<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\OrangeMoneyMlGateway;

final class OrangeMoneyMlSimulator implements OrangeMoneyMlGateway
{
    /** @param array<string,mixed> $statusResponse */
    public function __construct(private array $statusResponse = ['status' => 'PENDING']) {}

    public function oauth(array $configuration): array
    {
        if (($configuration['simulator_scenario'] ?? '') === 'oauth_refused') {
            throw new \RuntimeException('PAYMENT_PROVIDER_REJECTED');
        }

        return ['access_token' => 'simulator-token-not-a-secret', 'expires_in' => 120];
    }

    public function checkout(array $configuration, string $accessToken, CheckoutRequest $request): array
    {
        return match ($configuration['simulator_scenario'] ?? 'pending') {
            'timeout' => throw new \RuntimeException('PAYMENT_PROVIDER_TIMEOUT'),
            'outage' => throw new \RuntimeException('PAYMENT_PROVIDER_TEMPORARY'),
            'failed' => ['status' => 'FAILED', 'order_id' => $request->orderId],
            'cancelled' => ['status' => 'CANCELLED', 'order_id' => $request->orderId],
            default => [
                'status' => 'PENDING',
                'order_id' => $request->orderId,
                'payment_url' => 'https://orange-money-ml.simulator.invalid/checkout/'.$request->orderId,
                'pay_token' => 'sim-pay-'.$request->orderId,
                'notif_token' => 'sim-notif-'.$request->orderId,
                'reference' => 'sim-'.$request->orderId,
            ],
        };
    }

    public function status(array $configuration, string $accessToken, string $providerReference, array $context): array
    {
        return $this->statusResponse + [
            'reference' => $providerReference,
            'order_id' => $context['order_id'] ?? null,
            'amount' => $context['amount_minor'] ?? null,
            'currency' => $context['currency'] ?? 'XOF',
        ];
    }
}
