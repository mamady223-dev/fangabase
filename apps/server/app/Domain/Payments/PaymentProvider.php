<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

interface PaymentProvider
{
    public function descriptor(): ProviderDescriptor;

    public function createCheckout(CheckoutRequest $request): ProviderPayment;

    public function paymentStatus(string $providerReference): ProviderPayment;

    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund;
}
