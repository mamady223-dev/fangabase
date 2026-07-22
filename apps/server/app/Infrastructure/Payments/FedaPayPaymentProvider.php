<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\PaymentProvider;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderHttpClient;
use FangaBase\Domain\Payments\ProviderPayment;
use FangaBase\Domain\Payments\ProviderRefund;

final readonly class FedaPayPaymentProvider implements PaymentProvider
{
    public function __construct(private ProviderHttpClient $http, private ?string $secret, private bool $enabled, private string $baseUrl) {}

    public function descriptor(): ProviderDescriptor
    {
        return new ProviderDescriptor('fedapay', $this->enabled && $this->secret ? ProviderDescriptor::IMPLEMENTED_NEEDS_SANDBOX_UAT : ProviderDescriptor::DISABLED,
            ['ONE_TIME_PAYMENT', 'MOBILE_MONEY', 'HOSTED_CHECKOUT', 'REDIRECT', 'ASYNCHRONOUS_CONFIRMATION', 'STATUS'], ['XOF'], ['BJ', 'CI', 'SN', 'TG']);
    }

    public function createCheckout(CheckoutRequest $request): ProviderPayment
    {
        $transaction = $this->http->request('POST', $this->baseUrl.'/v1/transactions', $this->headers($request->idempotencyKey), [
            'description' => 'FangaBase order '.$request->orderId, 'amount' => $request->amountMinor, 'currency' => ['iso' => $request->currency],
            'callback_url' => $request->returnUrl, 'custom_metadata' => ['order_id' => $request->orderId],
        ], 'json', 15)->requireSuccess();
        $item = is_array($transaction['v1/transaction'] ?? null) ? $transaction['v1/transaction'] : ($transaction['transaction'] ?? $transaction);
        $id = $this->required($item, 'id');
        $token = $this->http->request('POST', $this->baseUrl.'/v1/transactions/'.rawurlencode($id).'/token', $this->headers($request->idempotencyKey.'-token'), [], 'json', 15)->requireSuccess();
        return new ProviderPayment($id, 'PENDING', $this->required($token, 'url'), null, null);
    }

    public function paymentStatus(string $providerReference): ProviderPayment
    {
        $json = $this->http->request('GET', $this->baseUrl.'/v1/transactions/'.rawurlencode($providerReference), $this->headers(null), [], 'json', 15)->requireSuccess();
        $item = is_array($json['v1/transaction'] ?? null) ? $json['v1/transaction'] : ($json['transaction'] ?? $json);
        $raw = strtolower((string) ($item['status'] ?? ''));
        $status = in_array($raw, ['approved', 'transferred'], true) ? 'SUCCEEDED' : (in_array($raw, ['declined', 'canceled'], true) ? 'FAILED' : 'PENDING');
        return new ProviderPayment($providerReference, $status, null, isset($item['amount']) ? (int) $item['amount'] : null, isset($item['currency']['iso']) ? strtoupper((string) $item['currency']['iso']) : null);
    }

    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund
    {
        throw new \RuntimeException('PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED');
    }

    private function headers(?string $idempotencyKey): array
    {
        return ['Authorization' => 'Bearer '.$this->secret];
    }

    private function required(array $json, string $key): string
    {
        if (! isset($json[$key]) || (! is_string($json[$key]) && ! is_int($json[$key]))) throw new \RuntimeException('PAYMENT_PROVIDER_INVALID_RESPONSE');
        return (string) $json[$key];
    }
}
