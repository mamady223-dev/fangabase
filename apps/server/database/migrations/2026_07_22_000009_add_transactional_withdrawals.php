<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payout_accounts', function (Blueprint $t): void {
            $t->string('owner_type', 20)->default('USER')->index();
            $t->char('currency', 3)->default('XOF');
            $t->char('destination_fingerprint', 64)->nullable()->index();
            $t->string('status', 20)->default('PENDING_VERIFICATION')->index();
        });
        Schema::table('withdrawals', function (Blueprint $t): void {
            $t->string('owner_type', 20)->default('USER')->index();
            $t->string('provider', 40)->default('unconfigured')->index();
            $t->string('idempotency_key', 128)->nullable();
            $t->string('reason', 500)->nullable();
            $t->uuid('approved_by')->nullable()->index();
            $t->timestampTz('verification_started_at')->nullable();
            $t->timestampTz('sent_at')->nullable();
            $t->timestampTz('paid_at')->nullable();
            $t->timestampTz('cancelled_at')->nullable();
            $t->timestampTz('available_at')->nullable()->index();
            $t->timestampTz('claimed_until')->nullable()->index();
            $t->unsignedSmallInteger('attempts')->default(0);
            $t->string('last_error_code', 80)->nullable();
            $t->unique(['owner_id', 'provider', 'idempotency_key']);
        });
        Schema::table('money_ledger_entries', function (Blueprint $t): void {
            $t->string('owner_type', 20)->default('USER')->index();
            $t->string('idempotency_scope', 160)->nullable()->unique();
            $t->json('safe_metadata')->nullable();
        });
        Schema::create('withdrawal_transitions', function (Blueprint $t): void {
            $t->uuid('id')->primary(); $t->uuid('withdrawal_id')->index(); $t->string('from_status', 30)->nullable(); $t->string('to_status', 30);
            $t->string('source', 30); $t->uuid('actor_id')->nullable(); $t->string('external_event_id')->nullable(); $t->json('safe_metadata'); $t->timestampTz('occurred_at')->index();
            $t->unique(['withdrawal_id', 'external_event_id', 'to_status'], 'withdrawal_event_status_unique');
        });
        Schema::create('payout_callbacks', function (Blueprint $t): void {
            $t->uuid('id')->primary(); $t->string('provider', 40); $t->string('external_event_id'); $t->string('event_type'); $t->string('status', 20);
            $t->json('safe_payload'); $t->timestampTz('received_at')->index(); $t->unique(['provider', 'external_event_id', 'event_type']);
        });
        Schema::create('reconciliation_anomalies', function (Blueprint $t): void {
            $t->uuid('id')->primary(); $t->uuid('run_id')->index(); $t->uuid('withdrawal_id')->nullable()->index(); $t->string('code', 80);
            $t->json('safe_details'); $t->string('status', 20)->default('OPEN')->index(); $t->timestampTz('detected_at')->index(); $t->timestampTz('resolved_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliation_anomalies'); Schema::dropIfExists('payout_callbacks'); Schema::dropIfExists('withdrawal_transitions');
        Schema::table('money_ledger_entries', fn (Blueprint $t) => $t->dropColumn(['owner_type', 'idempotency_scope', 'safe_metadata']));
        Schema::table('withdrawals', function (Blueprint $t): void { $t->dropUnique(['owner_id', 'provider', 'idempotency_key']); $t->dropColumn(['owner_type', 'provider', 'idempotency_key', 'reason', 'approved_by', 'verification_started_at', 'sent_at', 'paid_at', 'cancelled_at', 'available_at', 'claimed_until', 'attempts', 'last_error_code']); });
        Schema::table('payout_accounts', fn (Blueprint $t) => $t->dropColumn(['owner_type', 'currency', 'destination_fingerprint', 'status']));
    }
};
