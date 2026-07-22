<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use FangaBase\Domain\Billing\BillingScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class PayoutWorker
{
    public function __construct(private PayoutProviderRegistry $providers, private WithdrawalService $withdrawals, private WithdrawalLedger $ledger) {}

    public function runOnce(int $limit = 25): int
    {
        $ids = DB::transaction(function () use ($limit): array {
            $items = DB::table('withdrawals')->whereIn('status', ['APPROVED', 'SENT'])->where(fn ($q) => $q->whereNull('available_at')->orWhere('available_at', '<=', now()))
                ->where(fn ($q) => $q->whereNull('claimed_until')->orWhere('claimed_until', '<', now()))->orderBy('created_at')->limit(max(1, min(100, $limit)))->lockForUpdate()->get();
            foreach ($items as $item) DB::table('withdrawals')->where('id', $item->id)->update(['claimed_until' => now()->addSeconds((int) config('fangabase.withdrawals.lease_seconds', 60)), 'attempts' => (int) $item->attempts + 1, 'updated_at' => now()]);
            return $items->pluck('id')->all();
        });
        foreach ($ids as $id) $this->process((string) $id);
        return count($ids);
    }

    private function process(string $id): void
    {
        $item = DB::table('withdrawals')->where('id', $id)->first(); if ($item === null) return;
        try {
            $provider = $this->providers->require($item->provider);
            if ($item->status === 'APPROVED') DB::transaction(function () use ($item): void { $locked = DB::table('withdrawals')->where('id', $item->id)->lockForUpdate()->first(); $this->withdrawals->transition($locked, 'SENT', 'WORKER', null, null); DB::table('withdrawals')->where('id', $item->id)->update(['sent_at' => now()]); });
            $account = DB::table('payout_accounts')->where('id', $item->payout_account_id)->first();
            $destination = json_decode(decrypt($account->encrypted_details), true, flags: JSON_THROW_ON_ERROR);
            $result = $provider->initiate($item->id, (int) $item->amount_minor, $item->currency, $destination, 'withdrawal:'.$item->id);
            $this->applyResult($item->id, $result, 'WORKER', null);
        } catch (\Throwable $error) {
            $code = in_array($error->getMessage(), ['PAYOUT_TIMEOUT', 'PAYOUT_TEMPORARY', 'NEEDS_PROVIDER_CONTRACT'], true) ? $error->getMessage() : 'PAYOUT_PROVIDER_ERROR';
            DB::transaction(function () use ($id, $code): void {
                $item = DB::table('withdrawals')->where('id', $id)->lockForUpdate()->first(); $max = (int) config('fangabase.withdrawals.max_attempts', 8);
                if ((int) $item->attempts >= $max && in_array($item->status, ['SENT', 'APPROVED'], true)) { if ($item->status === 'APPROVED') { DB::table('withdrawals')->where('id', $id)->update(['status' => 'SENT']); $item->status = 'SENT'; } $this->withdrawals->transition($item, 'FAILED', 'WORKER', null, null); $this->withdrawals->release($item); }
                DB::table('withdrawals')->where('id', $id)->update(['claimed_until' => null, 'available_at' => now()->addSeconds(min(3600, 2 ** min(10, (int) $item->attempts))), 'last_error_code' => $code, 'updated_at' => now()]);
            });
        }
    }

    public function applyResult(string $id, PayoutResult $result, string $source, ?string $eventId): string
    {
        return DB::transaction(function () use ($id, $result, $source, $eventId): string {
            $item = DB::table('withdrawals')->where('id', $id)->lockForUpdate()->first(); if ($item === null) return 'UNKNOWN';
            if (in_array($item->status, ['PAID', 'FAILED', 'CANCELLED', 'RECONCILED'], true)) return $item->status;
            $to = match ($result->status) { 'PAID' => 'PAID', 'FAILED' => 'FAILED', default => 'PENDING' };
            if ($item->status === $to) return $to;
            if ($item->status === 'APPROVED') { $this->withdrawals->transition($item, 'SENT', $source, null, $eventId); $item->status = 'SENT'; }
            $this->withdrawals->transition($item, $to, $source, null, $eventId);
            DB::table('withdrawals')->where('id', $id)->update(['provider_reference' => $result->reference, 'claimed_until' => null, 'last_error_code' => null,
                'paid_at' => $to === 'PAID' ? now() : null, 'updated_at' => now()]);
            if ($to === 'FAILED') $this->withdrawals->release($item);
            if ($to === 'PAID') { $owner = new BillingScope($item->owner_type, $item->owner_id); $this->withdrawals->release($item); $this->ledger->append($owner, (int) $item->amount_minor, $item->currency, 'WITHDRAWAL_PAID', $item->id, 'withdrawal:'.$item->id.':paid'); }
            DB::table('outbox_events')->insertOrIgnore(['id' => (string) Str::uuid(), 'idempotency_key' => 'withdrawal-'.$to.':'.$id, 'type' => 'WITHDRAWAL_'.$to,
                'payload' => json_encode(['withdrawal_id' => $id, 'status' => $to], JSON_THROW_ON_ERROR), 'status' => 'PENDING', 'attempts' => 0, 'available_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            return $to;
        });
    }
}
