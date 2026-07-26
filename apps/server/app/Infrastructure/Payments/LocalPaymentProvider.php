<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\PaymentProvider;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderPayment;
use FangaBase\Domain\Payments\ProviderRefund;

final class LocalPaymentProvider implements PaymentProvider
{
    public function descriptor(): ProviderDescriptor
    {
        return new ProviderDescriptor(
            'local',
            ProviderDescriptor::IMPLEMENTED_NEEDS_SANDBOX_UAT,
            ['ONE_TIME_PAYMENT', 'SUBSCRIPTION', 'HOSTED_CHECKOUT', 'STATUS', 'FULL_REFUND', 'PARTIAL_REFUND'],
            ['XOF', 'EUR', 'USD'],
            ['*'],
        );
    }

    public function createCheckout(CheckoutRequest $request): ProviderPayment
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('LOCAL_PAYMENT_DISABLED');
        }

        return new ProviderPayment('local:'.$request->orderId, 'SUCCEEDED', 'https://local.invalid/pay/'.$request->orderId, $request->amountMinor, $request->currency);
    }

    public function paymentStatus(string $providerReference): ProviderPayment
    {
        return new ProviderPayment($providerReference, 'SUCCEEDED', null, null, null);
    }

    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('LOCAL_PAYMENT_DISABLED');
        }

        return new ProviderRefund('local-refund:'.hash('sha256', $providerReference.'|'.$idempotencyKey), 'PROCESSING');
    }
}
