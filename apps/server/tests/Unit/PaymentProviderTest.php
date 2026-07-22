<?php

declare(strict_types=1);

namespace FangaBase\Tests\Unit;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\ProviderHttpClient;
use FangaBase\Domain\Payments\ProviderHttpResponse;
use FangaBase\Infrastructure\Payments\StripePaymentProvider;
use PHPUnit\Framework\TestCase;

final class PaymentProviderTest extends TestCase
{
    public function test_stripe_uses_form_encoding_idempotency_and_integer_server_amount(): void
    {
        $http = new RecordingPaymentHttpClient(new ProviderHttpResponse(200, ['id' => 'cs_1', 'url' => 'https://checkout.stripe.test/session']));
        $payment = (new StripePaymentProvider($http, 'test-secret', true))->createCheckout(new CheckoutRequest('order-1', 2500, 'XOF', 'https://app.test/billing', 'key-000000000001', 'ONE_TIME'));
        self::assertSame('cs_1', $payment->reference); self::assertSame('form', $http->format); self::assertSame(2500, $http->body['line_items[0][price_data][unit_amount]']);
        self::assertSame('key-000000000001', $http->headers['Idempotency-Key']);
    }

    public function test_provider_response_rejects_4xx_5xx_and_non_json_without_leaking_body(): void
    {
        foreach ([new ProviderHttpResponse(400, ['secret' => 'must-not-leak']), new ProviderHttpResponse(503, []), new ProviderHttpResponse(200, null)] as $response) {
            try { $response->requireSuccess(); self::fail('unsafe response accepted'); }
            catch (\RuntimeException $error) { self::assertStringNotContainsString('must-not-leak', $error->getMessage()); }
        }
    }
}

final class RecordingPaymentHttpClient implements ProviderHttpClient
{
    public array $headers = []; public array $body = []; public string $format = '';
    public function __construct(private readonly ProviderHttpResponse $response) {}
    public function request(string $method, string $url, array $headers, array $body, string $format, int $timeoutSeconds): ProviderHttpResponse
    { $this->headers = $headers; $this->body = $body; $this->format = $format; return $this->response; }
}
