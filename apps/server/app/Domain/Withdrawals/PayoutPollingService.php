<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use Illuminate\Support\Facades\DB;

final readonly class PayoutPollingService
{
    public function __construct(private PayoutProviderRegistry $providers, private PayoutWorker $worker) {}
    public function poll(string $id): string
    {
        $item = DB::table('withdrawals')->where('id', $id)->first();
        if ($item === null || $item->provider_reference === null || ! in_array($item->status, ['SENT', 'PENDING'], true)) return $item?->status ?? 'UNKNOWN';
        return $this->worker->applyResult($id, $this->providers->require($item->provider)->status($item->provider_reference), 'POLL', 'poll:'.$item->provider_reference);
    }
}
