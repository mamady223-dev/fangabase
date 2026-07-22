<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\PersistentIdempotency;
use FangaBase\Domain\Billing\CreditService;
use FangaBase\Domain\Billing\SubscriptionService;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class RefundService
{
    public function __construct(private PaymentProviderRegistry $providers, private PersistentIdempotency $idempotency, private CreditService $credits, private SubscriptionService $subscriptions) {}

    public function request(BillingScope $owner, string $orderId, int $amountMinor, string $reason, string $key): array
    {
        if ($amountMinor <= 0 || trim($reason) === '') throw ApiProblem::validation();
        return DB::transaction(function () use ($owner, $orderId, $amountMinor, $reason, $key): array {
            $order = DB::table('orders')->where(['id' => $orderId, 'owner_id' => $owner->id, 'owner_type' => $owner->type])->lockForUpdate()->first();
            if ($order === null) throw ApiProblem::notFound();
            if ($order->status !== 'SUCCEEDED' || (int) $order->refunded_amount_minor + $amountMinor > (int) $order->amount_minor) throw ApiProblem::conflict('REFUND_AMOUNT_INVALID');
            $attempt = DB::table('payment_attempts')->where(['order_id' => $orderId, 'status' => 'SUCCEEDED'])->first();
            if ($attempt === null || $attempt->provider_reference === null) throw ApiProblem::conflict('REFUND_PAYMENT_NOT_CONFIRMED');
            $provider = $this->providers->require($order->provider, $amountMinor === (int) $order->amount_minor ? 'FULL_REFUND' : 'PARTIAL_REFUND', $order->currency);
            return $this->idempotency->execute($owner, 'REFUND_REQUEST', $order->provider, $key,
                ['order_id' => $orderId, 'amount_minor' => $amountMinor, 'reason' => $reason], function () use ($owner, $order, $attempt, $provider, $amountMinor, $reason, $key): array {
                    $id = (string) Str::uuid();
                    DB::table('refunds')->insert(['id' => $id, 'payment_attempt_id' => $attempt->id, 'owner_id' => $owner->id, 'amount_minor' => $amountMinor,
                        'currency' => $order->currency, 'status' => 'REQUESTED', 'reason' => $reason, 'idempotency_key' => $key, 'created_at' => now(), 'updated_at' => now()]);
                    if ($order->purpose === 'CREDITS' && $order->price_id !== null) {
                        $price = DB::table('prices')->where('id', $order->price_id)->first(); $plan = $price?->plan_id ? DB::table('plans')->where('id', $price->plan_id)->first() : null;
                        $included = (int) ($plan->included_credits ?? 0); $quantity = $amountMinor === (int) $order->amount_minor ? $included : intdiv($included * $amountMinor, (int) $order->amount_minor);
                        $reservation = $this->credits->reservePaidOrderRefund($owner, $order->id, $quantity, $id);
                        DB::table('refunds')->where('id', $id)->update(['credit_reservation_id' => $reservation]);
                    }
                    try { $external = $provider->requestRefund($attempt->provider_reference, $amountMinor, $order->currency, $key); }
                    catch (\Throwable) {
                        $reservation = DB::table('refunds')->where('id', $id)->value('credit_reservation_id');
                        if ($reservation !== null) $this->credits->settle($owner, (string) $reservation, false);
                        DB::table('refunds')->where('id', $id)->update(['status' => 'FAILED', 'failed_at' => now(), 'updated_at' => now()]);
                        return ['refund_id' => $id, 'status' => 'FAILED', 'amount_minor' => $amountMinor, 'currency' => $order->currency];
                    }
                    DB::table('refunds')->where('id', $id)->update(['provider_reference' => $external->reference, 'status' => 'PROCESSING', 'updated_at' => now()]);
                    return ['refund_id' => $id, 'status' => 'PROCESSING', 'amount_minor' => $amountMinor, 'currency' => $order->currency];
                });
        });
    }

    public function confirm(string $provider, string $providerRefundReference, bool $succeeded): string
    {
        return DB::transaction(function () use ($provider, $providerRefundReference, $succeeded): string {
            $refund = DB::table('refunds')->where('provider_reference', $providerRefundReference)->lockForUpdate()->first();
            if ($refund === null) return 'UNKNOWN';
            if (in_array($refund->status, ['CONFIRMED', 'FAILED'], true)) return $refund->status;
            $attempt = DB::table('payment_attempts')->where('id', $refund->payment_attempt_id)->first();
            $order = DB::table('orders')->where(['id' => $attempt->order_id, 'provider' => $provider])->lockForUpdate()->first();
            if ($order === null) return 'UNKNOWN';
            $owner = new BillingScope($order->owner_type, $order->owner_id);
            if (! $succeeded) { if ($refund->credit_reservation_id !== null) $this->credits->settle($owner, $refund->credit_reservation_id, false); DB::table('refunds')->where('id', $refund->id)->update(['status' => 'FAILED', 'failed_at' => now(), 'updated_at' => now()]); return 'FAILED'; }
            if ((int) $order->refunded_amount_minor + (int) $refund->amount_minor > (int) $order->amount_minor) throw ApiProblem::conflict('REFUND_AMOUNT_INVALID');
            DB::table('refunds')->where('id', $refund->id)->update(['status' => 'CONFIRMED', 'confirmed_at' => now(), 'updated_at' => now()]);
            $total = (int) $order->refunded_amount_minor + (int) $refund->amount_minor;
            DB::table('orders')->where('id', $order->id)->update(['refunded_amount_minor' => $total, 'status' => $total === (int) $order->amount_minor ? 'REFUNDED' : 'PARTIALLY_REFUNDED', 'updated_at' => now()]);
            DB::table('money_ledger_entries')->insert(['id' => (string) Str::uuid(), 'owner_id' => $order->owner_id, 'owner_type' => $order->owner_type, 'amount_minor' => $refund->amount_minor,
                'currency' => $refund->currency, 'kind' => 'REFUND', 'reference_type' => 'refund', 'reference_id' => $refund->id, 'occurred_at' => now()]);
            if ($refund->credit_reservation_id !== null) $this->credits->settle($owner, $refund->credit_reservation_id, true);
            if ($order->purpose === 'SUBSCRIPTION' && $total === (int) $order->amount_minor) {
                $subscription = DB::table('subscriptions')->where(['owner_id' => $order->owner_id, 'owner_type' => $order->owner_type, 'price_id' => $order->price_id])->orderByDesc('created_at')->first();
                if ($subscription !== null && ! in_array($subscription->status, ['CANCELLED', 'EXPIRED'], true)) {
                    $this->subscriptions->applyVerifiedEvent($subscription->id, 'refund:'.$refund->id, (int) $subscription->last_event_sequence + 1, 'CANCELLED');
                    DB::table('entitlement_grants')->where(['source_type' => 'SUBSCRIPTION', 'source_id' => $subscription->id])->whereNull('revoked_at')->update(['revoked_at' => now(), 'updated_at' => now()]);
                }
            }
            DB::table('outbox_events')->insert(['id' => (string) Str::uuid(), 'idempotency_key' => 'refund-confirmed:'.$refund->id, 'type' => 'REFUND_CONFIRMED',
                'payload' => json_encode(['refund_id' => $refund->id, 'order_id' => $order->id], JSON_THROW_ON_ERROR), 'status' => 'PENDING', 'attempts' => 0,
                'available_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            return 'CONFIRMED';
        });
    }
}
