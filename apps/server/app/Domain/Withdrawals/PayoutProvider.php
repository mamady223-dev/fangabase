<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

interface PayoutProvider
{
    public function name(): string;
    public function activation(): string;
    public function initiate(string $withdrawalId, int $amountMinor, string $currency, array $destination, string $idempotencyKey): PayoutResult;
    public function status(string $providerReference): PayoutResult;
    public function cancel(string $providerReference): PayoutResult;
}
