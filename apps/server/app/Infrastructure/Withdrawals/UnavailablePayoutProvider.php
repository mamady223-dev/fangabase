<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Withdrawals;

use FangaBase\Domain\Withdrawals\PayoutProvider;
use FangaBase\Domain\Withdrawals\PayoutResult;

final readonly class UnavailablePayoutProvider implements PayoutProvider
{
    public function __construct(private string $provider) {}
    public function name(): string { return $this->provider; }
    public function activation(): string { return 'NEEDS_PROVIDER_CONTRACT'; }
    public function initiate(string $withdrawalId, int $amountMinor, string $currency, array $destination, string $idempotencyKey): PayoutResult { throw new \RuntimeException('NEEDS_PROVIDER_CONTRACT'); }
    public function status(string $providerReference): PayoutResult { throw new \RuntimeException('NEEDS_PROVIDER_CONTRACT'); }
    public function cancel(string $providerReference): PayoutResult { throw new \RuntimeException('NEEDS_PROVIDER_CONTRACT'); }
}
