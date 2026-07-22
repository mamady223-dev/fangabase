<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\PaymentProvider;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderPayment;
use FangaBase\Domain\Payments\ProviderRefund;

final readonly class UnavailablePaymentProvider implements PaymentProvider
{
    public function __construct(private ProviderDescriptor $value) {}
    public function descriptor(): ProviderDescriptor { return $this->value; }
    public function createCheckout(CheckoutRequest $request): ProviderPayment { throw new \RuntimeException('PAYMENT_PROVIDER_UNAVAILABLE'); }
    public function paymentStatus(string $providerReference): ProviderPayment { throw new \RuntimeException('PAYMENT_PROVIDER_UNAVAILABLE'); }
    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund { throw new \RuntimeException('PAYMENT_PROVIDER_UNAVAILABLE'); }
}
