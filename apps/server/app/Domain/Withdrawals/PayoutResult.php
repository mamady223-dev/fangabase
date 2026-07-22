<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

final readonly class PayoutResult
{
    public function __construct(public string $reference, public string $status, public array $safeMetadata = []) {}
}
