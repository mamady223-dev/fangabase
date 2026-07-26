<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['orders', 'payment_attempts', 'subscriptions', 'payout_accounts', 'reconciliation_runs', 'webhook_events', 'idempotency_keys'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'provider')) {
                DB::table($table)->where('provider', 'orange_money')->update(['provider' => 'orange_money_ml']);
            }
        }
    }

    public function down(): void
    {
        foreach (['orders', 'payment_attempts', 'subscriptions', 'payout_accounts', 'reconciliation_runs', 'webhook_events', 'idempotency_keys'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'provider')) {
                DB::table($table)->where('provider', 'orange_money_ml')->update(['provider' => 'orange_money']);
            }
        }
    }
};
