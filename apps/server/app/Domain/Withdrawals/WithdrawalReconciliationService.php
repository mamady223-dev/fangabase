<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class WithdrawalReconciliationService
{
    public function __construct(private PayoutPollingService $polling) {}

    public function run(string $provider): array
    {
        $runId = (string) Str::uuid(); DB::table('reconciliation_runs')->insert(['id' => $runId, 'provider' => $provider, 'status' => 'RUNNING', 'report' => json_encode([], JSON_THROW_ON_ERROR), 'started_at' => now()]);
        $checked = 0; $anomalies = 0;
        foreach (DB::table('withdrawals')->where('provider', $provider)->whereIn('status', ['SENT', 'PENDING', 'PAID'])->get() as $item) {
            $checked++;
            try { $status = $this->polling->poll($item->id); }
            catch (\Throwable) { $status = 'QUERY_FAILED'; }
            $fresh = DB::table('withdrawals')->where('id', $item->id)->first();
            $entries = DB::table('money_ledger_entries')->where(['reference_type' => 'withdrawal', 'reference_id' => $item->id])->pluck('kind')->all();
            $code = null;
            if ($fresh->status === 'PAID' && (! in_array('WITHDRAWAL_PAID', $entries, true) || ! in_array('WITHDRAWAL_RESERVE_RELEASE', $entries, true))) $code = 'PAID_LEDGER_MISMATCH';
            elseif (in_array($fresh->status, ['CANCELLED', 'FAILED'], true) && ! in_array('WITHDRAWAL_RESERVE_RELEASE', $entries, true)) $code = 'RESERVE_NOT_RELEASED';
            elseif ($status === 'UNKNOWN') $code = 'PROVIDER_STATUS_UNKNOWN';
            elseif ($status === 'QUERY_FAILED') $code = 'PROVIDER_QUERY_FAILED';
            if ($code !== null) { $anomalies++; DB::table('reconciliation_anomalies')->insert(['id' => (string) Str::uuid(), 'run_id' => $runId, 'withdrawal_id' => $item->id,
                'code' => $code, 'safe_details' => json_encode(['internal_status' => $fresh->status], JSON_THROW_ON_ERROR), 'status' => 'OPEN', 'detected_at' => now()]); }
        }
        $report = ['checked' => $checked, 'anomalies' => $anomalies]; DB::table('reconciliation_runs')->where('id', $runId)->update(['status' => $anomalies > 0 ? 'ANOMALIES' : 'COMPLETED', 'report' => json_encode($report, JSON_THROW_ON_ERROR), 'finished_at' => now()]);
        return ['run_id' => $runId, ...$report];
    }

    public function resolve(string $anomalyId, string $actorId, string $reason): void
    {
        if (trim($reason) === '') throw new \InvalidArgumentException('REASON_REQUIRED');
        DB::transaction(function () use ($anomalyId, $actorId, $reason): void {
            $anomaly = DB::table('reconciliation_anomalies')->where('id', $anomalyId)->lockForUpdate()->first(); if ($anomaly === null || $anomaly->status !== 'OPEN') return;
            DB::table('reconciliation_anomalies')->where('id', $anomalyId)->update(['status' => 'RESOLVED', 'resolved_at' => now()]);
            DB::table('audit_events')->insert(['id' => (string) Str::uuid(), 'actor_id' => $actorId, 'organization_id' => null, 'action' => 'RECONCILIATION_ANOMALY_RESOLVED',
                'target_type' => 'reconciliation_anomaly', 'target_id' => $anomalyId, 'reason' => $reason, 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'occurred_at' => now()]);
        });
    }
}
