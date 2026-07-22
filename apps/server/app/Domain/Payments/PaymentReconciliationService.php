<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final readonly class PaymentReconciliationService
{
    public function __construct(private PaymentProviderRegistry $providers, private PaymentWebhookProcessor $processor) {}

    public function reconcile(string $orderId): string
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if ($order === null) throw ApiProblem::notFound();
        $attempt = DB::table('payment_attempts')->where(['order_id' => $orderId, 'provider' => $order->provider])->orderByDesc('created_at')->first();
        if ($attempt === null || $attempt->provider_reference === null) throw ApiProblem::conflict('PAYMENT_REFERENCE_MISSING');
        $provider = $this->providers->require($order->provider, 'STATUS', $order->currency);
        $payment = $provider->paymentStatus($attempt->provider_reference);
        if (! in_array($payment->status, ['SUCCEEDED', 'FAILED'], true)) return 'PENDING';
        return $this->processor->process(new VerifiedPaymentEvent($order->provider, 'reconcile:'.$payment->reference.':'.$payment->status,
            'payment.reconciled', $order->id, $payment->reference, $payment->status, $payment->amountMinor, $payment->currency, time(), ['source' => 'provider_status']));
    }
}
