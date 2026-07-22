<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\ProviderHttpClient;
use FangaBase\Domain\Payments\ProviderHttpResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class LaravelPaymentHttpClient implements ProviderHttpClient
{
    public function request(string $method, string $url, array $headers, array $body, string $format, int $timeoutSeconds): ProviderHttpResponse
    {
        try {
            $pending = Http::timeout($timeoutSeconds)->connectTimeout(min(5, $timeoutSeconds))->withHeaders($headers);
            $response = $format === 'form'
                ? $pending->asForm()->send($method, $url, ['form_params' => $body])
                : $pending->send($method, $url, ['json' => $body]);
            $json = $response->json();
            return new ProviderHttpResponse($response->status(), is_array($json) ? $json : null);
        } catch (ConnectionException) {
            throw new \RuntimeException('PAYMENT_PROVIDER_TIMEOUT');
        }
    }
}
