<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

final readonly class CheckoutRequest
{
    public function __construct(
        public string $orderId,
        public int $amountMinor,
        public string $currency,
        public string $returnUrl,
        public string $idempotencyKey,
        public string $mode,
        public ?string $interval = null,
    ) {}
}
