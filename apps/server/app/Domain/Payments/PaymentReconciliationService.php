<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final readonly class PaymentReconciliationService
{
    public function __construct(private PaymentProviderRegistry $providers, private PaymentWebhookProcessor $processor, private AuditRecorder $audit) {}

    public function reconcile(string $orderId): string
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if ($order === null) throw ApiProblem::notFound();
        $attempt = DB::table('payment_attempts')->where(['order_id' => $orderId, 'provider' => $order->provider])->orderByDesc('created_at')->first();
        if ($attempt === null || $attempt->provider_reference === null) throw ApiProblem::conflict('PAYMENT_REFERENCE_MISSING');
        $provider = $this->providers->require($order->provider, 'STATUS', $order->currency);
        $context = json_decode((string) $attempt->safe_metadata, true);
        $payment = $provider->paymentStatus($attempt->provider_reference, is_array($context) ? $context : []);
        if ($payment->status === 'NEEDS_REVIEW'
            || ($payment->amountMinor !== null && $payment->amountMinor !== (int) $order->amount_minor)
            || ($payment->currency !== null && strtoupper($payment->currency) !== $order->currency)) {
            DB::transaction(function () use ($order, $attempt, $payment): void {
                DB::table('orders')->where('id', $order->id)->update(['status' => 'NEEDS_REVIEW', 'updated_at' => now()]);
                DB::table('payment_attempts')->where('id', $attempt->id)->update(['status' => 'NEEDS_REVIEW', 'raw_status' => $payment->status, 'updated_at' => now()]);
                $this->audit->record((string) $order->owner_id, $order->owner_type === 'ORGANIZATION' ? (string) $order->owner_id : null,
                    'payment.provider_review_required', 'order', (string) $order->id, 'PROVIDER_STATUS_OR_AMOUNT_MISMATCH',
                    ['provider' => (string) $order->provider]);
            });

            return 'NEEDS_REVIEW';
        }
        if (! in_array($payment->status, ['SUCCEEDED', 'FAILED'], true)) return 'PENDING';
        return $this->processor->process(new VerifiedPaymentEvent($order->provider, 'reconcile:'.$payment->reference.':'.$payment->status,
            'payment.reconciled', $order->id, $payment->reference, $payment->status, $payment->amountMinor, $payment->currency, time(), ['source' => 'provider_status']));
    }
}
