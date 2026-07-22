<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\CreditService;
use FangaBase\Domain\Billing\SubscriptionService;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class PaymentWebhookProcessor
{
    public function __construct(private CreditService $credits, private SubscriptionService $subscriptions) {}

    public function process(VerifiedPaymentEvent $event): string
    {
        return DB::transaction(function () use ($event): string {
            $inserted = DB::table('webhook_events')->insertOrIgnore(['id' => (string) Str::uuid(), 'provider' => $event->provider,
                'external_event_id' => $event->eventId, 'event_type' => $event->eventType, 'status' => 'PROCESSING',
                'safe_payload' => json_encode($event->safePayload, JSON_THROW_ON_ERROR), 'received_at' => now()]);
            if ($inserted === 0) return 'DUPLICATE';
            $order = DB::table('orders')->where('id', $event->orderId)->lockForUpdate()->first();
            if ($order === null || $order->provider !== $event->provider) throw ApiProblem::notFound();
            if ($event->status === 'IGNORED') { $this->finish($event, 'IGNORED'); return 'IGNORED'; }
            if ($event->status === 'SUCCEEDED') {
                if ($event->amountMinor === null || $event->currency === null || $event->amountMinor !== (int) $order->amount_minor || strtoupper($event->currency) !== $order->currency) {
                    throw ApiProblem::conflict('PAYMENT_EVENT_MISMATCH');
                }
                if ($order->status === 'SUCCEEDED') { $this->finish($event, 'DUPLICATE'); return 'DUPLICATE'; }
                if (! in_array($order->status, ['PENDING', 'PROCESSING'], true)) throw ApiProblem::conflict('PAYMENT_TRANSITION_INVALID');
                DB::table('orders')->where('id', $order->id)->update(['status' => 'SUCCEEDED', 'paid_at' => now(), 'updated_at' => now()]);
                DB::table('payment_attempts')->where(['order_id' => $order->id, 'provider' => $event->provider])->update(['status' => 'SUCCEEDED',
                    'provider_reference' => $event->providerReference, 'confirmed_at' => now(), 'updated_at' => now()]);
                DB::table('money_ledger_entries')->insert(['id' => (string) Str::uuid(), 'owner_id' => $order->owner_id, 'owner_type' => $order->owner_type, 'amount_minor' => $order->amount_minor,
                    'currency' => $order->currency, 'kind' => 'PAYMENT', 'reference_type' => 'order', 'reference_id' => $order->id, 'occurred_at' => now()]);
                $owner = new BillingScope($order->owner_type, $order->owner_id);
                if ($order->purpose === 'CREDITS' && $order->price_id !== null) $this->credits->grantPaidOrder($owner, $order->price_id, $order->id, $event->provider);
                if ($order->purpose === 'SUBSCRIPTION') {
                    $subscription = DB::table('subscriptions')->where(['owner_id' => $order->owner_id, 'owner_type' => $order->owner_type, 'price_id' => $order->price_id])->orderByDesc('created_at')->first();
                    if ($subscription !== null) $this->subscriptions->applyVerifiedEvent($subscription->id, $event->eventId, max(1, $event->sequence), 'ACTIVE');
                }
                $this->transition($order->id, $order->status, 'SUCCEEDED', $event);
                DB::table('outbox_events')->insert(['id' => (string) Str::uuid(), 'idempotency_key' => 'payment-succeeded:'.$order->id, 'type' => 'PAYMENT_SUCCEEDED',
                    'payload' => json_encode(['order_id' => $order->id, 'owner_type' => $order->owner_type, 'owner_id' => $order->owner_id], JSON_THROW_ON_ERROR),
                    'status' => 'PENDING', 'attempts' => 0, 'available_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            } elseif ($event->status === 'FAILED' && in_array($order->status, ['PENDING', 'PROCESSING'], true)) {
                DB::table('orders')->where('id', $order->id)->update(['status' => 'FAILED', 'updated_at' => now()]);
                $this->transition($order->id, $order->status, 'FAILED', $event);
            }
            $this->finish($event, 'PROCESSED');
            return 'PROCESSED';
        });
    }

    private function transition(string $orderId, string $from, string $to, VerifiedPaymentEvent $event): void
    {
        DB::table('payment_transitions')->insert(['id' => (string) Str::uuid(), 'order_id' => $orderId, 'from_status' => $from, 'to_status' => $to,
            'source' => 'VERIFIED_WEBHOOK', 'external_event_id' => $event->eventId, 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'occurred_at' => now()]);
    }

    private function finish(VerifiedPaymentEvent $event, string $status): void
    {
        DB::table('webhook_events')->where(['provider' => $event->provider, 'external_event_id' => $event->eventId, 'event_type' => $event->eventType])->update(['status' => $status]);
    }
}
