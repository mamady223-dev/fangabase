<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use Illuminate\Support\Facades\DB;

final class PaymentMaintenanceService
{
    public function expirePending(): int
    {
        return DB::transaction(function (): int {
            $ids = DB::table('orders')->whereIn('status', ['PENDING', 'PROCESSING'])->whereNotNull('expires_at')->where('expires_at', '<=', now())->pluck('id');
            if ($ids->isEmpty()) return 0;
            DB::table('payment_attempts')->whereIn('order_id', $ids)->whereIn('status', ['CREATED', 'PENDING', 'PROCESSING'])->update(['status' => 'EXPIRED', 'updated_at' => now()]);
            return DB::table('orders')->whereIn('id', $ids)->update(['status' => 'EXPIRED', 'updated_at' => now()]);
        });
    }
}
