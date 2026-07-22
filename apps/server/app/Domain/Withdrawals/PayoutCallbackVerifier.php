<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

interface PayoutCallbackVerifier
{
    public function verify(string $provider, string $rawBody, array $headers, int $now): VerifiedPayoutCallback;
}
