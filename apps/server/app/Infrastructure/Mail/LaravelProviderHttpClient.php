<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Mail;

use FangaBase\Domain\Infrastructure\Mail\ProviderHttpClient;
use FangaBase\Domain\Infrastructure\Mail\ProviderHttpResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class LaravelProviderHttpClient implements ProviderHttpClient
{
    public function post(string $url, array $headers, array $payload, int $timeoutSeconds): ProviderHttpResponse
    {
        try {
            $response = Http::timeout($timeoutSeconds)->withHeaders($headers)->post($url, $payload);
            $json = $response->json();
            return new ProviderHttpResponse($response->status(), is_array($json) ? $json : null, $this->retryAfter($response->header('Retry-After')));
        } catch (ConnectionException) {
            return new ProviderHttpResponse(0, null);
        }
    }

    private function retryAfter(?string $value): ?int
    {
        return $value !== null && ctype_digit($value) ? min(3600, (int) $value) : null;
    }
}
