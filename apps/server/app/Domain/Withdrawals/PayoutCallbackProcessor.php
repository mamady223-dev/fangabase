<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class PayoutCallbackProcessor
{
    public function __construct(private PayoutWorker $worker) {}
    public function process(VerifiedPayoutCallback $event): string
    {
        return DB::transaction(function () use ($event): string {
            $inserted = DB::table('payout_callbacks')->insertOrIgnore(['id' => (string) Str::uuid(), 'provider' => $event->provider, 'external_event_id' => $event->eventId,
                'event_type' => $event->eventType, 'status' => 'PROCESSING', 'safe_payload' => json_encode($event->safePayload, JSON_THROW_ON_ERROR), 'received_at' => now()]);
            if ($inserted === 0) return 'DUPLICATE';
            $item = DB::table('withdrawals')->where(['id' => $event->withdrawalId, 'provider' => $event->provider])->first();
            if ($item === null || ($item->provider_reference !== null && $item->provider_reference !== $event->result->reference)) throw new \RuntimeException('PAYOUT_CALLBACK_MISMATCH');
            $status = $this->worker->applyResult($item->id, $event->result, 'CALLBACK', $event->eventId);
            DB::table('payout_callbacks')->where(['provider' => $event->provider, 'external_event_id' => $event->eventId, 'event_type' => $event->eventType])->update(['status' => 'PROCESSED']);
            return $status;
        });
    }
}
