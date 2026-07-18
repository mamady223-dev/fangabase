<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SubscriptionService
{
    private const TRANSITIONS = [
        'PENDING' => ['TRIALING', 'ACTIVE', 'CANCELLED', 'EXPIRED'], 'TRIALING' => ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'],
        'ACTIVE' => ['PAST_DUE', 'SUSPENDED', 'CANCEL_AT_PERIOD_END', 'CANCELLED', 'EXPIRED'],
        'PAST_DUE' => ['ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'], 'SUSPENDED' => ['ACTIVE', 'CANCELLED', 'EXPIRED'],
        'CANCEL_AT_PERIOD_END' => ['ACTIVE', 'CANCELLED', 'EXPIRED'], 'CANCELLED' => [], 'EXPIRED' => [],
    ];

    public function createPending(BillingScope $owner, string $planId, string $priceId): array
    {
        $plan = DB::table('plans')->where('id', $planId)->where('active', true)->first(); $price = DB::table('prices')->where(['id' => $priceId, 'plan_id' => $planId, 'active' => true])->whereNull('archived_at')->first();
        if ($plan === null || $price === null) throw ApiProblem::notFound();
        return DB::transaction(function () use ($owner, $planId, $priceId): array { $id = (string) Str::uuid(); $now = now(); DB::table('subscriptions')->insert(['id' => $id, 'owner_id' => $owner->id, 'owner_type' => $owner->type, 'plan_id' => $planId, 'price_id' => $priceId, 'provider' => 'local', 'provider_reference' => 'local:'.$id, 'status' => 'PENDING', 'last_event_sequence' => 0, 'created_at' => $now, 'updated_at' => $now]); $this->history($id, null, 'PENDING', 'INTERNAL', null, null); return ['id' => $id, 'status' => 'PENDING']; });
    }

    public function applyVerifiedEvent(string $subscriptionId, string $eventId, int $sequence, string $status, ?\DateTimeInterface $periodStart = null, ?\DateTimeInterface $periodEnd = null): bool
    {
        if ($eventId === '' || $sequence <= 0) throw ApiProblem::validation();
        return DB::transaction(function () use ($subscriptionId, $eventId, $sequence, $status, $periodStart, $periodEnd): bool {
            $subscription = DB::table('subscriptions')->where('id', $subscriptionId)->lockForUpdate()->first(); if ($subscription === null) throw ApiProblem::notFound();
            if ($sequence <= (int) $subscription->last_event_sequence || DB::table('subscription_transitions')->where(['subscription_id' => $subscriptionId, 'external_event_id' => $eventId])->exists()) return false;
            $this->assertTransition((string) $subscription->status, $status); DB::table('subscriptions')->where('id', $subscriptionId)->update(['status' => $status, 'current_period_start' => $periodStart, 'current_period_end' => $periodEnd, 'last_event_sequence' => $sequence, 'updated_at' => now()]); $this->history($subscriptionId, $subscription->status, $status, 'VERIFIED_PROVIDER_EVENT', $eventId, $sequence); return true;
        });
    }

    public function scheduleCancellation(BillingScope $owner, string $subscriptionId, bool $immediate): array
    {
        return DB::transaction(function () use ($owner, $subscriptionId, $immediate): array { $sub = DB::table('subscriptions')->where(['id' => $subscriptionId, 'owner_id' => $owner->id, 'owner_type' => $owner->type])->lockForUpdate()->first(); if ($sub === null) throw ApiProblem::notFound(); $next = $immediate ? 'CANCELLED' : 'CANCEL_AT_PERIOD_END'; $this->assertTransition($sub->status, $next); DB::table('subscriptions')->where('id', $sub->id)->update(['status' => $next, 'cancel_at' => $immediate ? now() : $sub->current_period_end, 'ended_at' => $immediate ? now() : null, 'updated_at' => now()]); $this->history($sub->id, $sub->status, $next, 'OWNER', null, null); return ['id' => $sub->id, 'status' => $next, 'cancel_at' => $immediate ? now()->toISOString() : $sub->current_period_end]; });
    }

    public function current(BillingScope $owner): ?object { return DB::table('subscriptions')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type])->orderByDesc('created_at')->first(['id', 'plan_id', 'price_id', 'status', 'current_period_start', 'current_period_end', 'cancel_at']); }
    private function assertTransition(string $from, string $to): void { if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) throw ApiProblem::conflict('SUBSCRIPTION_TRANSITION_INVALID'); }
    private function history(string $id, ?string $from, string $to, string $source, ?string $event, ?int $sequence): void { DB::table('subscription_transitions')->insert(['id' => (string) Str::uuid(), 'subscription_id' => $id, 'from_status' => $from, 'to_status' => $to, 'source' => $source, 'external_event_id' => $event, 'event_sequence' => $sequence, 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'occurred_at' => now()]); }
}
