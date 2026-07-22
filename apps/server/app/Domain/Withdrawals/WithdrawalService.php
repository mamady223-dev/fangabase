<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\PersistentIdempotency;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Domain\Identity\PersistentRateLimiter;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class WithdrawalService
{
    private const TRANSITIONS = [
        'REQUESTED' => ['VERIFYING', 'CANCELLED'], 'VERIFYING' => ['APPROVED', 'CANCELLED'], 'APPROVED' => ['SENT', 'CANCELLED'],
        'SENT' => ['PENDING', 'PAID', 'FAILED'], 'PENDING' => ['PAID', 'FAILED'], 'FAILED' => ['RECONCILED'],
        'PAID' => ['RECONCILED'], 'CANCELLED' => [], 'RECONCILED' => [],
    ];

    public function __construct(private WithdrawalLedger $ledger, private PersistentIdempotency $idempotency, private PersistentRateLimiter $rateLimiter, private AuditRecorder $audit, private PayoutProviderRegistry $providers) {}

    public function request(BillingScope $owner, string $accountId, int $amountMinor, string $currency, string $key): array
    {
        $currency = strtoupper($currency); $minimum = (int) config('fangabase.withdrawals.minimum_minor', 1000); $maximum = (int) config('fangabase.withdrawals.maximum_minor', 1000000);
        if ($amountMinor < $minimum || $amountMinor > $maximum || preg_match('/^[A-Z]{3}$/', $currency) !== 1 || ! in_array($currency, (array) config('fangabase.withdrawals.currencies', ['XOF']), true)) throw ApiProblem::validation();
        $this->rateLimiter->assertAllowed('withdrawal:'.$owner->key(), (int) config('fangabase.withdrawals.rate_limit', 5), 3600);
        $this->rateLimiter->hit('withdrawal:'.$owner->key(), (int) config('fangabase.withdrawals.rate_limit', 5), 3600);
        return DB::transaction(function () use ($owner, $accountId, $amountMinor, $currency, $key): array {
            $account = DB::table('payout_accounts')->where(['id' => $accountId, 'owner_id' => $owner->id, 'owner_type' => $owner->type, 'currency' => $currency, 'status' => 'VERIFIED'])->lockForUpdate()->first();
            if ($account === null) throw ApiProblem::notFound();
            return $this->idempotency->execute($owner, 'WITHDRAWAL_REQUEST', $account->provider, $key, ['account_id' => $accountId, 'amount_minor' => $amountMinor, 'currency' => $currency], function () use ($owner, $account, $amountMinor, $currency, $key): array {
                if ($this->ledger->available($owner, $currency, true) < $amountMinor) throw ApiProblem::conflict('INSUFFICIENT_BALANCE');
                $id = (string) Str::uuid(); $now = now();
                DB::table('withdrawals')->insert(['id' => $id, 'owner_id' => $owner->id, 'owner_type' => $owner->type, 'payout_account_id' => $account->id,
                    'amount_minor' => $amountMinor, 'currency' => $currency, 'provider' => $account->provider, 'idempotency_key' => $key,
                    'status' => 'REQUESTED', 'available_at' => $now, 'created_at' => $now, 'updated_at' => $now]);
                $this->ledger->append($owner, $amountMinor, $currency, 'WITHDRAWAL_RESERVE', $id, 'withdrawal:'.$id.':reserve');
                $this->history($id, null, 'REQUESTED', 'OWNER', null, null);
                return ['id' => $id, 'status' => 'REQUESTED', 'amount_minor' => $amountMinor, 'currency' => $currency];
            });
        });
    }

    public function startVerification(AuthenticatedActor $actor, string $id): array { return $this->adminTransition($actor, $id, 'VERIFYING', 'WITHDRAWAL_VERIFYING'); }
    public function approve(AuthenticatedActor $actor, string $id): array { return $this->adminTransition($actor, $id, 'APPROVED', 'WITHDRAWAL_APPROVED'); }

    public function cancel(BillingScope $owner, string $id): array
    {
        return DB::transaction(function () use ($owner, $id): array {
            $item = DB::table('withdrawals')->where(['id' => $id, 'owner_id' => $owner->id, 'owner_type' => $owner->type])->lockForUpdate()->first();
            if ($item === null) throw ApiProblem::notFound();
            $this->assertTransition($item->status, 'CANCELLED'); $this->transition($item, 'CANCELLED', 'OWNER', null, null);
            $this->release($item); DB::table('withdrawals')->where('id', $id)->update(['cancelled_at' => now()]);
            return ['id' => $id, 'status' => 'CANCELLED'];
        });
    }

    public function list(BillingScope $owner, int $page, int $perPage): array
    {
        $page = max(1, $page); $perPage = max(1, min(100, $perPage)); $query = DB::table('withdrawals')->where(['owner_id' => $owner->id, 'owner_type' => $owner->type])->orderByDesc('created_at');
        return ['data' => $query->forPage($page, $perPage)->get(['id', 'amount_minor', 'currency', 'provider', 'status', 'created_at'])->all(), 'page' => $page, 'per_page' => $perPage, 'total' => $query->count()];
    }

    public function adminList(AuthenticatedActor $actor, int $page, int $perPage): array
    {
        $this->admin($actor); $page = max(1, $page); $perPage = max(1, min(100, $perPage)); $query = DB::table('withdrawals')->orderByDesc('created_at');
        return ['data' => $query->forPage($page, $perPage)->get(['id', 'owner_type', 'owner_id', 'amount_minor', 'currency', 'provider', 'status', 'created_at'])->all(), 'page' => $page, 'per_page' => $perPage, 'total' => $query->count()];
    }

    private function adminTransition(AuthenticatedActor $actor, string $id, string $status, string $action): array
    {
        $this->admin($actor);
        return DB::transaction(function () use ($actor, $id, $status, $action): array {
            $item = DB::table('withdrawals')->where('id', $id)->lockForUpdate()->first(); if ($item === null) throw ApiProblem::notFound();
            $this->assertOwnerActive($item);
            if (DB::table('payout_accounts')->where(['id' => $item->payout_account_id, 'status' => 'VERIFIED'])->doesntExist()) throw ApiProblem::conflict('PAYOUT_ACCOUNT_SUSPENDED');
            if ($status === 'APPROVED') $this->providers->require($item->provider);
            $this->assertTransition($item->status, $status); $this->transition($item, $status, 'ADMIN', $actor->id, null);
            $updates = $status === 'VERIFYING' ? ['verification_started_at' => now()] : ['approved_at' => now(), 'approved_by' => $actor->id, 'available_at' => now()];
            DB::table('withdrawals')->where('id', $id)->update($updates); $this->audit->record($actor->id, $item->owner_type === 'ORGANIZATION' ? $item->owner_id : null, $action, 'withdrawal', $id, null, ['status' => $status]);
            return ['id' => $id, 'status' => $status];
        });
    }

    public function transition(object $item, string $to, string $source, ?string $actorId, ?string $eventId): void
    {
        $this->assertTransition($item->status, $to); DB::table('withdrawals')->where('id', $item->id)->update(['status' => $to, 'updated_at' => now()]);
        $this->history($item->id, $item->status, $to, $source, $actorId, $eventId);
    }
    public function release(object $item): void { $this->ledger->append(new BillingScope($item->owner_type, $item->owner_id), (int) $item->amount_minor, $item->currency, 'WITHDRAWAL_RESERVE_RELEASE', $item->id, 'withdrawal:'.$item->id.':release'); }
    private function assertTransition(string $from, string $to): void { if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) throw ApiProblem::conflict('WITHDRAWAL_TRANSITION_INVALID'); }
    private function admin(AuthenticatedActor $actor): void { if (! in_array($actor->globalRole, ['ADMIN', 'SUPERADMIN'], true)) throw ApiProblem::forbidden(); }
    private function assertOwnerActive(object $item): void { $table = $item->owner_type === 'ORGANIZATION' ? 'organizations' : 'users'; if (DB::table($table)->where(['id' => $item->owner_id, 'status' => 'ACTIVE'])->doesntExist()) throw ApiProblem::conflict('WITHDRAWAL_OWNER_SUSPENDED'); }
    private function history(string $id, ?string $from, string $to, string $source, ?string $actor, ?string $event): void { DB::table('withdrawal_transitions')->insert(['id' => (string) Str::uuid(), 'withdrawal_id' => $id, 'from_status' => $from, 'to_status' => $to, 'source' => $source, 'actor_id' => $actor, 'external_event_id' => $event, 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'occurred_at' => now()]); }
}
