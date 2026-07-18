<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Mail;

use FangaBase\Domain\Infrastructure\Mail\MailDeliveryResult;
use FangaBase\Domain\Infrastructure\Mail\MailMessage;
use FangaBase\Domain\Infrastructure\Mail\ProviderHttpClient;
use FangaBase\Domain\Infrastructure\Mail\TransactionalMailProvider;

final readonly class BrevoMailProvider implements TransactionalMailProvider
{
    public function __construct(private ProviderHttpClient $http, private ?string $apiKey, private int $timeoutSeconds = 10) {}
    public function name(): string { return 'brevo'; }

    public function send(MailMessage $message): MailDeliveryResult
    {
        if ($this->apiKey === null || trim($this->apiKey) === '') return MailDeliveryResult::disabled();
        $response = $this->http->post('https://api.brevo.com/v3/smtp/email', [
            'api-key' => $this->apiKey,
            'idempotency-key' => $message->idempotencyKey,
        ], array_filter([
            'sender' => ['email' => $message->sender],
            'to' => array_map(static fn (string $email): array => ['email' => $email], $message->to),
            'subject' => $message->subject, 'textContent' => $message->text, 'htmlContent' => $message->html,
            'headers' => $message->headers ?: null,
        ], static fn (mixed $value): bool => $value !== null), $this->timeoutSeconds);

        if ($response->status === 201 && is_string($response->json['messageId'] ?? null)) return MailDeliveryResult::sent($response->json['messageId']);
        return ProviderResultClassifier::classify($response->status, $response->retryAfterSeconds);
    }
}
