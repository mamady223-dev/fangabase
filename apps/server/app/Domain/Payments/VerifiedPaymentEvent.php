<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

final readonly class VerifiedPaymentEvent
{
    public function __construct(public string $provider, public string $eventId, public string $eventType, public string $orderId,
        public string $providerReference, public string $status, public ?int $amountMinor, public ?string $currency, public int $sequence, public array $safePayload = []) {}
}
