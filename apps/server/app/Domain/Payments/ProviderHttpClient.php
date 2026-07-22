<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

interface ProviderHttpClient
{
    public function request(string $method, string $url, array $headers, array $body, string $format, int $timeoutSeconds): ProviderHttpResponse;
}
