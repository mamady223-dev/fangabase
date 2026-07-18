<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Mail;

use FangaBase\Domain\Infrastructure\Mail\MailDeliveryResult;
use FangaBase\Domain\Infrastructure\Mail\MailMessage;
use FangaBase\Domain\Infrastructure\Mail\ProviderHttpClient;
use FangaBase\Domain\Infrastructure\Mail\TransactionalMailProvider;

final readonly class ResendMailProvider implements TransactionalMailProvider
{
    public function __construct(private ProviderHttpClient $http, private ?string $apiKey, private int $timeoutSeconds = 10) {}
    public function name(): string { return 'resend'; }

    public function send(MailMessage $message): MailDeliveryResult
    {
        if ($this->apiKey === null || trim($this->apiKey) === '') return MailDeliveryResult::disabled();
        $response = $this->http->post('https://api.resend.com/emails', [
            'Authorization' => 'Bearer '.$this->apiKey,
            'Idempotency-Key' => $message->idempotencyKey,
        ], array_filter([
            'from' => $message->sender, 'to' => $message->to, 'subject' => $message->subject,
            'text' => $message->text, 'html' => $message->html, 'headers' => $message->headers ?: null,
        ], static fn (mixed $value): bool => $value !== null), $this->timeoutSeconds);

        if ($response->status === 200 && is_string($response->json['id'] ?? null)) return MailDeliveryResult::sent($response->json['id']);
        return ProviderResultClassifier::classify($response->status, $response->retryAfterSeconds);
    }
}
