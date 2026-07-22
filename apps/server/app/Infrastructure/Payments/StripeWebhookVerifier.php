<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\VerifiedPaymentEvent;
use FangaBase\Domain\Payments\WebhookVerifier;

final readonly class StripeWebhookVerifier implements WebhookVerifier
{
    public function __construct(private string $secret, private int $toleranceSeconds = 300, private int $maxBytes = 1048576) {}

    public function verify(string $rawBody, array $headers, int $now): VerifiedPaymentEvent
    {
        if ($this->secret === '' || strlen($rawBody) > $this->maxBytes) throw new \RuntimeException('WEBHOOK_REJECTED');
        $headerValue = $headers['stripe-signature'] ?? $headers['Stripe-Signature'] ?? '';
        $header = is_array($headerValue) ? (string) ($headerValue[0] ?? '') : (string) $headerValue;
        $parts = [];
        foreach (explode(',', $header) as $part) { [$key, $value] = array_pad(explode('=', trim($part), 2), 2, ''); $parts[$key][] = $value; }
        $timestamp = isset($parts['t'][0]) ? (int) $parts['t'][0] : 0;
        if ($timestamp <= 0 || abs($now - $timestamp) > $this->toleranceSeconds) throw new \RuntimeException('WEBHOOK_REJECTED');
        $expected = hash_hmac('sha256', $timestamp.'.'.$rawBody, $this->secret);
        $valid = false;
        foreach ($parts['v1'] ?? [] as $signature) $valid = $valid || hash_equals($expected, $signature);
        if (! $valid) throw new \RuntimeException('WEBHOOK_REJECTED');
        $payload = json_decode($rawBody, true, flags: JSON_THROW_ON_ERROR); $object = $payload['data']['object'] ?? [];
        $orderId = (string) ($object['client_reference_id'] ?? $object['metadata']['order_id'] ?? '');
        if ($orderId === '' || ! isset($payload['id'], $payload['type'], $object['id'])) throw new \RuntimeException('WEBHOOK_REJECTED');
        $status = match ((string) $payload['type']) { 'checkout.session.completed', 'checkout.session.async_payment_succeeded' => 'SUCCEEDED',
            'checkout.session.async_payment_failed', 'checkout.session.expired' => 'FAILED', default => 'IGNORED' };
        return new VerifiedPaymentEvent('stripe', (string) $payload['id'], (string) $payload['type'], $orderId,
            (string) ($object['payment_intent'] ?? $object['id']), $status, isset($object['amount_total']) ? (int) $object['amount_total'] : null,
            isset($object['currency']) ? strtoupper((string) $object['currency']) : null, $timestamp,
            ['livemode' => (bool) ($payload['livemode'] ?? false)]);
    }
}
