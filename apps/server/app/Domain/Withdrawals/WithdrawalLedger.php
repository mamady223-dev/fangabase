<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use FangaBase\Domain\Billing\BillingScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WithdrawalLedger
{
    private const NEGATIVE = ['REFUND', 'WITHDRAWAL_RESERVE', 'WITHDRAWAL_PAID'];
    private const POSITIVE = ['PAYMENT', 'WITHDRAWAL_RESERVE_RELEASE', 'ADJUSTMENT_CREDIT'];

    public function available(BillingScope $owner, string $currency, bool $lock = false): int
    {
        $query = DB::table('money_ledger_entries')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type, 'currency' => $currency]);
        if ($lock) $query->lockForUpdate();
        $balance = 0;
        foreach ($query->get(['amount_minor', 'kind']) as $entry) {
            if (in_array($entry->kind, self::POSITIVE, true)) $balance += (int) $entry->amount_minor;
            elseif (in_array($entry->kind, self::NEGATIVE, true)) $balance -= (int) $entry->amount_minor;
        }
        return $balance;
    }

    public function append(BillingScope $owner, int $amountMinor, string $currency, string $kind, string $withdrawalId, string $scope): void
    {
        DB::table('money_ledger_entries')->insertOrIgnore(['id' => (string) Str::uuid(), 'owner_id' => $owner->id, 'owner_type' => $owner->type,
            'amount_minor' => $amountMinor, 'currency' => $currency, 'kind' => $kind, 'reference_type' => 'withdrawal', 'reference_id' => $withdrawalId,
            'idempotency_scope' => $scope, 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'occurred_at' => now()]);
    }

    public function summary(BillingScope $owner, string $currency): array
    {
        $reserved = (int) DB::table('withdrawals')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type, 'currency' => $currency])->whereIn('status', ['REQUESTED', 'VERIFYING', 'APPROVED', 'SENT', 'PENDING'])->sum('amount_minor');
        $paid = (int) DB::table('withdrawals')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type, 'currency' => $currency, 'status' => 'PAID'])->sum('amount_minor');
        return ['available_minor' => $this->available($owner, $currency), 'reserved_minor' => $reserved, 'paid_minor' => $paid, 'currency' => $currency];
    }
}
