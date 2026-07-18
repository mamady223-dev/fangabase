<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

final readonly class ProviderHttpResponse
{
    /** @param array<string, mixed>|null $json */
    public function __construct(public int $status, public ?array $json, public ?int $retryAfterSeconds = null) {}
}
