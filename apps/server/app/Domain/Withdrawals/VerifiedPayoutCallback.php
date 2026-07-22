<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

final readonly class VerifiedPayoutCallback
{
    public function __construct(public string $provider, public string $eventId, public string $eventType, public string $withdrawalId, public PayoutResult $result, public array $safePayload = []) {}
}
