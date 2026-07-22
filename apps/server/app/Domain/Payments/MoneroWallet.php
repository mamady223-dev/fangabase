<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

interface MoneroWallet
{
    public function createIntegratedAddress(string $paymentId): string;
    /** @return list<array{amount_atomic:int, confirmations:int, tx_hash:string}> */
    public function payments(string $paymentId): array;
}
