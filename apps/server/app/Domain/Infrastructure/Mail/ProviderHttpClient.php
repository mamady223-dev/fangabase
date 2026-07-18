<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

interface ProviderHttpClient
{
    /** @param array<string, string> $headers @param array<string, mixed> $payload */
    public function post(string $url, array $headers, array $payload, int $timeoutSeconds): ProviderHttpResponse;
}
