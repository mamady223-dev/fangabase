<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use Illuminate\Support\Facades\DB;

final class EntitlementService
{
    public function resolve(BillingScope $owner): array
    {
        if ($this->suspended($owner)) return ['suspended' => true, 'features' => []];
        $features = [];
        $subscription = DB::table('subscriptions')->join('plans', 'plans.id', '=', 'subscriptions.plan_id')->where(['subscriptions.owner_id' => $owner->id, 'subscriptions.owner_type' => $owner->type])->whereIn('subscriptions.status', ['TRIALING', 'ACTIVE', 'CANCEL_AT_PERIOD_END'])->where(fn ($q) => $q->whereNull('subscriptions.current_period_end')->orWhere('subscriptions.current_period_end', '>', now()))->orderByDesc('subscriptions.created_at')->first(['subscriptions.id', 'subscriptions.current_period_end', 'plans.entitlements']);
        if ($subscription !== null) foreach (json_decode((string) $subscription->entitlements, true, flags: JSON_THROW_ON_ERROR) as $feature => $limit) $features[$feature] = ['granted' => true, 'limit' => is_int($limit) ? $limit : null, 'used' => $this->used($owner, $feature), 'valid_until' => $subscription->current_period_end, 'source' => 'PLAN'];
        $grants = DB::table('entitlement_grants')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type])->whereNull('revoked_at')->where('valid_from', '<=', now())->where(fn ($q) => $q->whereNull('valid_until')->orWhere('valid_until', '>', now()))->get();
        foreach ($grants as $grant) { $current = $features[$grant->feature]['limit'] ?? 0; $features[$grant->feature] = ['granted' => true, 'limit' => $grant->limit_quantity === null ? null : max((int) $current, (int) $grant->limit_quantity), 'used' => $this->used($owner, $grant->feature), 'valid_until' => $grant->valid_until, 'source' => $grant->source_type]; }
        return ['suspended' => false, 'features' => $features];
    }
    public function has(BillingScope $owner, string $feature): bool { return (bool) ($this->resolve($owner)['features'][$feature]['granted'] ?? false); }
    private function used(BillingScope $owner, string $meter): int { return (int) DB::table('usage_events')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type, 'meter' => $meter])->sum('quantity'); }
    private function suspended(BillingScope $owner): bool { return $owner->type === 'USER' ? DB::table('users')->where('id', $owner->id)->where('status', 'SUSPENDED')->exists() : DB::table('organizations')->where('id', $owner->id)->where('status', 'SUSPENDED')->exists(); }
}
