<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

interface PayoutProvider
{
    public function requestPayout(string $withdrawalId, int $amountMinor, string $currency, array $encryptedDestination, string $idempotencyKey): ProviderPayment;
    public function payoutStatus(string $providerReference): ProviderPayment;
}
