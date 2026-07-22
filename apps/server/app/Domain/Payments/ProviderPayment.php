<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

final readonly class ProviderPayment
{
    public function __construct(
        public string $reference,
        public string $status,
        public ?string $checkoutUrl,
        public ?int $amountMinor,
        public ?string $currency,
        public array $safeMetadata = [],
    ) {}
}
