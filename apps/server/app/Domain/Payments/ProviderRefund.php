<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

final readonly class ProviderRefund
{
    public function __construct(public string $reference, public string $status, public array $safeMetadata = []) {}
}
