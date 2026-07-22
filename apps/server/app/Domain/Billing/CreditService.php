<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreditService
{
    public function __construct(private PersistentIdempotency $idempotency, private CatalogService $catalog, private AuditRecorder $audit) {}

    public function purchase(BillingScope $owner, string $priceId, string $key): array
    {
        return DB::transaction(function () use ($owner, $priceId, $key): array {
            $price = $this->catalog->serverPrice($priceId);
            return $this->idempotency->execute($owner, 'credit_purchase', 'local', $key, ['price_id' => $priceId], function () use ($owner, $price): array {
                $plan = $price->plan_id ? DB::table('plans')->where('id', $price->plan_id)->first() : null;
                $quantity = (int) ($plan->included_credits ?? 0);
                if ($quantity <= 0) throw ApiProblem::validation();
                $entry = $this->grant($owner, $quantity, 'PURCHASE', 'price:'.$price->id, null, ['amount_minor' => (int) $price->amount_minor, 'currency' => $price->currency]);
                return ['entry_id' => $entry, 'quantity' => $quantity, 'price_id' => $price->id, 'amount_minor' => (int) $price->amount_minor, 'currency' => $price->currency];
            });
        });
    }

    public function administrativeGrant(AuthenticatedActor $actor, BillingScope $owner, int $quantity, string $reason, ?\DateTimeInterface $expiresAt, string $key): array
    {
        if ($actor->globalRole !== 'SUPERADMIN' || $quantity <= 0 || trim($reason) === '') throw ApiProblem::forbidden();
        return DB::transaction(function () use ($actor, $owner, $quantity, $reason, $expiresAt, $key): array {
            $result = $this->idempotency->execute($owner, 'admin_credit_grant', 'internal', $key, ['quantity' => $quantity, 'reason' => $reason, 'expires_at' => $expiresAt?->format(DATE_ATOM)], fn (): array => ['entry_id' => $this->grant($owner, $quantity, 'ADMIN_GRANT', 'admin:'.$key, $expiresAt, ['reason' => $reason]), 'quantity' => $quantity]);
            $this->audit->record($actor->id, $owner->type === 'ORGANIZATION' ? $owner->id : null, 'CREDITS_GRANTED', 'credit_wallet', $owner->key(), $reason, ['quantity' => $quantity]);
            return $result;
        });
    }

    public function reserve(BillingScope $owner, int $quantity, string $reference, string $key): array
    {
        if ($quantity <= 0) throw ApiProblem::validation();
        return DB::transaction(function () use ($owner, $quantity, $reference, $key): array {
            return $this->idempotency->execute($owner, 'credit_reserve', 'internal', $key, ['quantity' => $quantity, 'reference' => $reference], function () use ($owner, $quantity, $reference): array {
                $wallet = $this->wallet($owner, true); $remaining = $quantity; $allocations = [];
                $lots = DB::table('credit_lots')->where('wallet_id', $wallet->id)->where('quantity_remaining', '>', 0)->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')->orderBy('expires_at')->lockForUpdate()->get();
                foreach ($lots as $lot) { if ($remaining === 0) break; $take = min($remaining, (int) $lot->quantity_remaining); DB::table('credit_lots')->where('id', $lot->id)->update(['quantity_remaining' => (int) $lot->quantity_remaining - $take, 'quantity_reserved' => (int) $lot->quantity_reserved + $take, 'updated_at' => now()]); $allocations[] = ['lot_id' => $lot->id, 'quantity' => $take]; $remaining -= $take; }
                if ($remaining > 0) throw ApiProblem::conflict('INSUFFICIENT_CREDITS');
                $id = (string) Str::uuid(); DB::table('credit_reservations')->insert(['id' => $id, 'wallet_id' => $wallet->id, 'quantity' => $quantity, 'status' => 'RESERVED', 'reference' => $reference, 'allocations' => json_encode($allocations, JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
                $this->entry($wallet->id, -$quantity, 'RESERVE', $reference, null, 'credit_reserve'); return ['reservation_id' => $id, 'quantity' => $quantity, 'status' => 'RESERVED'];
            });
        });
    }

    public function settle(BillingScope $owner, string $reservationId, bool $confirm): array
    {
        return DB::transaction(function () use ($owner, $reservationId, $confirm): array {
            $wallet = $this->wallet($owner, true); $reservation = DB::table('credit_reservations')->where(['id' => $reservationId, 'wallet_id' => $wallet->id])->lockForUpdate()->first();
            if ($reservation === null) throw ApiProblem::notFound();
            if ($reservation->status !== 'RESERVED') return ['reservation_id' => $reservationId, 'status' => $reservation->status];
            foreach (json_decode((string) $reservation->allocations, true, flags: JSON_THROW_ON_ERROR) as $allocation) {
                $lot = DB::table('credit_lots')->where('id', $allocation['lot_id'])->lockForUpdate()->first();
                if ($confirm) DB::table('credit_lots')->where('id', $lot->id)->update(['quantity_reserved' => (int) $lot->quantity_reserved - $allocation['quantity'], 'updated_at' => now()]);
                else DB::table('credit_lots')->where('id', $lot->id)->update(['quantity_remaining' => (int) $lot->quantity_remaining + $allocation['quantity'], 'quantity_reserved' => (int) $lot->quantity_reserved - $allocation['quantity'], 'updated_at' => now()]);
            }
            $status = $confirm ? 'CONFIRMED' : 'RELEASED'; DB::table('credit_reservations')->where('id', $reservationId)->update(['status' => $status, 'updated_at' => now()]);
            if (! $confirm) $this->entry($wallet->id, (int) $reservation->quantity, 'RELEASE', (string) $reservation->reference, null, 'credit_release');
            return ['reservation_id' => $reservationId, 'status' => $status];
        });
    }

    public function refund(BillingScope $owner, int $quantity, string $reference, string $key): array
    {
        if ($quantity <= 0) throw ApiProblem::validation();
        return DB::transaction(fn (): array => $this->idempotency->execute($owner, 'credit_refund', 'internal', $key, ['quantity' => $quantity, 'reference' => $reference], fn (): array => ['entry_id' => $this->grant($owner, $quantity, 'REFUND', $reference), 'quantity' => $quantity]));
    }

    public function grantPaidOrder(BillingScope $owner, string $priceId, string $orderId, string $provider): array
    {
        $price = $this->catalog->serverPrice($priceId);
        $plan = $price->plan_id ? DB::table('plans')->where('id', $price->plan_id)->first() : null;
        $quantity = (int) ($plan->included_credits ?? 0);
        if ($quantity <= 0) throw ApiProblem::validation();
        return $this->idempotency->execute($owner, 'credit_paid_order', $provider, 'paid-order-'.$orderId, ['price_id' => $priceId, 'order_id' => $orderId],
            fn (): array => ['entry_id' => $this->grant($owner, $quantity, 'PURCHASE', 'order:'.$orderId, null,
                ['amount_minor' => (int) $price->amount_minor, 'currency' => $price->currency]), 'quantity' => $quantity]);
    }

    public function reservePaidOrderRefund(BillingScope $owner, string $orderId, int $quantity, string $refundId): ?string
    {
        if ($quantity <= 0) return null;
        $wallet = $this->wallet($owner, true);
        $entry = DB::table('credit_ledger_entries')->where(['wallet_id' => $wallet->id, 'reference' => 'order:'.$orderId, 'kind' => 'PURCHASE'])->first();
        $lot = $entry ? DB::table('credit_lots')->where('source_entry_id', $entry->id)->lockForUpdate()->first() : null;
        if ($lot === null || (int) $lot->quantity_remaining < $quantity) throw ApiProblem::conflict('REFUND_CREDITS_ALREADY_USED');
        DB::table('credit_lots')->where('id', $lot->id)->update(['quantity_remaining' => (int) $lot->quantity_remaining - $quantity, 'quantity_reserved' => (int) $lot->quantity_reserved + $quantity, 'updated_at' => now()]);
        $id = (string) Str::uuid();
        DB::table('credit_reservations')->insert(['id' => $id, 'wallet_id' => $wallet->id, 'quantity' => $quantity, 'status' => 'RESERVED', 'reference' => 'refund:'.$refundId,
            'allocations' => json_encode([['lot_id' => $lot->id, 'quantity' => $quantity]], JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
        $this->entry($wallet->id, -$quantity, 'PURCHASE_REFUND_RESERVE', 'refund:'.$refundId, 'refund:'.$refundId, 'credit_purchase_refund');
        return $id;
    }

    public function summary(BillingScope $owner, int $page = 1, int $perPage = 25): array
    {
        $wallet = $this->wallet($owner); $this->expire($wallet->id); $perPage = max(1, min(100, $perPage)); $page = max(1, $page);
        $available = (int) DB::table('credit_ledger_entries')->where('wallet_id', $wallet->id)->sum('quantity_fixed');
        $entries = DB::table('credit_ledger_entries')->where('wallet_id', $wallet->id)->orderByDesc('occurred_at');
        return ['balance' => $available, 'unit' => $wallet->unit, 'history' => ['data' => $entries->forPage($page, $perPage)->get(['id', 'quantity_fixed', 'scale', 'kind', 'reference', 'occurred_at'])->all(), 'page' => $page, 'per_page' => $perPage, 'total' => $entries->count()]];
    }

    public function exceptionalAdjustment(AuthenticatedActor $actor, BillingScope $owner, int $quantity, string $reason, string $key): array
    {
        if ($actor->globalRole !== 'SUPERADMIN' || $quantity === 0 || trim($reason) === '') throw ApiProblem::forbidden();
        if ($quantity > 0) return $this->administrativeGrant($actor, $owner, $quantity, $reason, null, $key);
        $reservation = $this->reserve($owner, abs($quantity), 'adjustment:'.$key, $key);
        $result = $this->settle($owner, $reservation['reservation_id'], true);
        $this->audit->record($actor->id, $owner->type === 'ORGANIZATION' ? $owner->id : null, 'CREDITS_ADJUSTED', 'credit_wallet', $owner->key(), $reason, ['quantity' => $quantity]);
        return $result;
    }

    private function grant(BillingScope $owner, int $quantity, string $kind, string $reference, ?\DateTimeInterface $expiresAt = null, array $metadata = []): string
    {
        if ($quantity <= 0) throw ApiProblem::validation(); $wallet = $this->wallet($owner, true); $entry = $this->entry($wallet->id, $quantity, $kind, $reference, null, strtolower($kind), $metadata); $lot = (string) Str::uuid();
        DB::table('credit_lots')->insert(['id' => $lot, 'wallet_id' => $wallet->id, 'source_entry_id' => $entry, 'quantity_total' => $quantity, 'quantity_remaining' => $quantity, 'quantity_reserved' => 0, 'expires_at' => $expiresAt, 'created_at' => now(), 'updated_at' => now()]); DB::table('credit_ledger_entries')->where('id', $entry)->update(['lot_id' => $lot]); return $entry;
    }
    private function expire(string $walletId): void
    {
        DB::transaction(function () use ($walletId): void {
            $lots = DB::table('credit_lots')->where('wallet_id', $walletId)->where('quantity_remaining', '>', 0)->whereNotNull('expires_at')->where('expires_at', '<=', now())->lockForUpdate()->get();
            foreach ($lots as $lot) { $quantity = (int) $lot->quantity_remaining; DB::table('credit_lots')->where('id', $lot->id)->update(['quantity_remaining' => 0, 'updated_at' => now()]); $this->entry($walletId, -$quantity, 'EXPIRATION', 'lot:'.$lot->id, 'expire:'.$lot->id, 'credit_expiration'); }
        });
    }
    private function entry(string $walletId, int $quantity, string $kind, string $reference, ?string $scope, string $operation, array $metadata = []): string { $id = (string) Str::uuid(); DB::table('credit_ledger_entries')->insert(['id' => $id, 'wallet_id' => $walletId, 'quantity_fixed' => $quantity, 'scale' => 0, 'kind' => $kind, 'reference' => $reference, 'operation' => $operation, 'idempotency_scope' => $scope, 'safe_metadata' => json_encode($metadata, JSON_THROW_ON_ERROR), 'occurred_at' => now()]); return $id; }
    private function wallet(BillingScope $owner, bool $lock = false): object { $query = DB::table('credit_wallets')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type, 'unit' => 'credit']); if ($lock) $query->lockForUpdate(); $wallet = $query->first(); if ($wallet === null) { DB::table('credit_wallets')->insert(['id' => (string) Str::uuid(), 'owner_id' => $owner->id, 'owner_type' => $owner->type, 'unit' => 'credit', 'created_at' => now(), 'updated_at' => now()]); $wallet = DB::table('credit_wallets')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type, 'unit' => 'credit'])->first(); } return $wallet; }
}
