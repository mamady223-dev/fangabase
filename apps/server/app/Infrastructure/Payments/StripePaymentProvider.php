<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\PaymentProvider;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderHttpClient;
use FangaBase\Domain\Payments\ProviderPayment;
use FangaBase\Domain\Payments\ProviderRefund;

final readonly class StripePaymentProvider implements PaymentProvider
{
    public function __construct(private ProviderHttpClient $http, private ?string $secret, private bool $enabled) {}

    public function descriptor(): ProviderDescriptor
    {
        return new ProviderDescriptor('stripe', $this->enabled && $this->secret ? ProviderDescriptor::IMPLEMENTED_NEEDS_SANDBOX_UAT : ProviderDescriptor::DISABLED,
            ['ONE_TIME_PAYMENT', 'SUBSCRIPTION', 'HOSTED_CHECKOUT', 'REDIRECT', 'ASYNCHRONOUS_CONFIRMATION', 'WEBHOOK', 'STATUS', 'FULL_REFUND', 'PARTIAL_REFUND'], ['*'], ['*']);
    }

    public function createCheckout(CheckoutRequest $request): ProviderPayment
    {
        $body = ['mode' => $request->mode === 'SUBSCRIPTION' ? 'subscription' : 'payment', 'client_reference_id' => $request->orderId,
            'success_url' => $request->returnUrl, 'cancel_url' => $request->returnUrl,
            'line_items[0][price_data][currency]' => strtolower($request->currency), 'line_items[0][price_data][unit_amount]' => $request->amountMinor,
            'line_items[0][price_data][product_data][name]' => 'FangaBase order '.$request->orderId, 'line_items[0][quantity]' => 1];
        if ($request->mode === 'SUBSCRIPTION') {
            $body['line_items[0][price_data][recurring][interval]'] = match ($request->interval) { 'YEAR' => 'year', 'WEEK' => 'week', 'DAY' => 'day', default => 'month' };
        }
        $json = $this->http->request('POST', 'https://api.stripe.com/v1/checkout/sessions', $this->headers($request->idempotencyKey), $body, 'form', 15)->requireSuccess();
        return new ProviderPayment($this->required($json, 'id'), 'PENDING', $this->required($json, 'url'), null, null);
    }

    public function paymentStatus(string $providerReference): ProviderPayment
    {
        $json = $this->http->request('GET', 'https://api.stripe.com/v1/checkout/sessions/'.rawurlencode($providerReference), $this->headers(null), [], 'form', 15)->requireSuccess();
        $status = ($json['payment_status'] ?? '') === 'paid' ? 'SUCCEEDED' : 'PENDING';
        return new ProviderPayment($providerReference, $status, null, isset($json['amount_total']) ? (int) $json['amount_total'] : null, isset($json['currency']) ? strtoupper((string) $json['currency']) : null);
    }

    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund
    {
        $json = $this->http->request('POST', 'https://api.stripe.com/v1/refunds', $this->headers($idempotencyKey), ['payment_intent' => $providerReference, 'amount' => $amountMinor], 'form', 15)->requireSuccess();
        return new ProviderRefund($this->required($json, 'id'), 'PROCESSING');
    }

    private function headers(?string $idempotencyKey): array
    {
        $headers = ['Authorization' => 'Bearer '.$this->secret];
        if ($idempotencyKey !== null) $headers['Idempotency-Key'] = $idempotencyKey;
        return $headers;
    }

    private function required(array $json, string $key): string
    {
        if (! isset($json[$key]) || ! is_string($json[$key]) || $json[$key] === '') throw new \RuntimeException('PAYMENT_PROVIDER_INVALID_RESPONSE');
        return $json[$key];
    }
}
