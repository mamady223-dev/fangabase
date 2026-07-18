<?php

declare(strict_types=1);

namespace FangaBase\Tests\Unit;

use FangaBase\Domain\Infrastructure\Mail\MailMessage;
use FangaBase\Domain\Infrastructure\Mail\ProviderHttpClient;
use FangaBase\Domain\Infrastructure\Mail\ProviderHttpResponse;
use FangaBase\Infrastructure\Mail\BrevoMailProvider;
use FangaBase\Infrastructure\Mail\ResendMailProvider;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class InfrastructureMailProviderTest extends TestCase
{
    public function test_resend_success_forwards_idempotency_without_exposing_key_in_result(): void
    {
        $http = new FakeProviderHttpClient(new ProviderHttpResponse(200, ['id' => 'mail_123']));
        $result = (new ResendMailProvider($http, 'secret-key'))->send($this->message());
        self::assertTrue($result->delivered);
        self::assertSame('mail_123', $result->providerMessageId);
        self::assertSame('delivery-1', $http->headers['Idempotency-Key']);
        self::assertStringNotContainsString('secret-key', json_encode($result, JSON_THROW_ON_ERROR));
    }

    public function test_brevo_success_uses_expected_contract(): void
    {
        $http = new FakeProviderHttpClient(new ProviderHttpResponse(201, ['messageId' => '<abc@brevo>']));
        $result = (new BrevoMailProvider($http, 'secret-key'))->send($this->message());
        self::assertTrue($result->delivered);
        self::assertSame('user@example.test', $http->payload['to'][0]['email']);
    }

    public function test_incomplete_configuration_never_calls_network(): void
    {
        $http = new FakeProviderHttpClient(new ProviderHttpResponse(200, ['id' => 'unexpected']));
        $result = (new ResendMailProvider($http, null))->send($this->message());
        self::assertSame('PROVIDER_DISABLED', $result->code);
        self::assertSame(0, $http->calls);
    }

    #[DataProvider('failures')]
    public function test_errors_are_safely_classified(int $status, string $code, bool $retryable): void
    {
        $http = new FakeProviderHttpClient(new ProviderHttpResponse($status, null, 17));
        $result = (new ResendMailProvider($http, 'key'))->send($this->message());
        self::assertSame($code, $result->code);
        self::assertSame($retryable, $result->retryable);
    }

    public static function failures(): array
    {
        return [[0, 'PROVIDER_TIMEOUT', true], [429, 'PROVIDER_RATE_LIMITED', true], [503, 'PROVIDER_UNAVAILABLE', true], [401, 'PROVIDER_AUTHENTICATION_FAILED', false], [422, 'PROVIDER_REJECTED', false], [200, 'PROVIDER_RESPONSE_INVALID', true]];
    }

    public function test_header_injection_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new MailMessage('sender@example.test', ['user@example.test'], "subject\r\nBcc: bad@example.test", 'text', null, 'key');
    }

    private function message(): MailMessage
    {
        return new MailMessage('sender@example.test', ['user@example.test'], 'Subject', 'Text', '<p>Text</p>', 'delivery-1');
    }
}

final class FakeProviderHttpClient implements ProviderHttpClient
{
    public int $calls = 0;
    public array $headers = [];
    public array $payload = [];
    public function __construct(private readonly ProviderHttpResponse $response) {}
    public function post(string $url, array $headers, array $payload, int $timeoutSeconds): ProviderHttpResponse
    {
        $this->calls++; $this->headers = $headers; $this->payload = $payload; return $this->response;
    }
}
