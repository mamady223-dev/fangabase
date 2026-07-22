<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

final readonly class ProviderHttpResponse
{
    public function __construct(public int $status, public ?array $json) {}

    public function requireSuccess(): array
    {
        if ($this->status < 200 || $this->status >= 300 || $this->json === null) {
            throw new \RuntimeException($this->status >= 500 ? 'PAYMENT_PROVIDER_TEMPORARY' : 'PAYMENT_PROVIDER_REJECTED');
        }
        return $this->json;
    }
}
