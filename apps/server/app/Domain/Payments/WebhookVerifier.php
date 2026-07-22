<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

interface WebhookVerifier
{
    public function verify(string $rawBody, array $headers, int $now): VerifiedPaymentEvent;
}
