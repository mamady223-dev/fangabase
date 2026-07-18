<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t): void {
            $t->text('description')->nullable();
            $t->string('purchase_mode', 20)->default('CREDITS');
            $t->unsignedInteger('terms_version')->default(1);
            $t->timestampTz('archived_at')->nullable()->index();
        });
        Schema::table('plans', function (Blueprint $t): void {
            $t->uuid('product_id')->nullable()->index();
            $t->unsignedBigInteger('included_credits')->default(0);
            $t->boolean('active')->default(true)->index();
            $t->unsignedInteger('terms_version')->default(1);
            $t->timestampTz('archived_at')->nullable();
            $t->foreign('product_id')->references('id')->on('products');
        });
        Schema::table('prices', function (Blueprint $t): void {
            $t->uuid('plan_id')->nullable()->index();
            $t->string('interval', 20)->default('ONE_TIME');
            $t->unsignedInteger('terms_version')->default(1);
            $t->timestampTz('archived_at')->nullable()->index();
            $t->foreign('plan_id')->references('id')->on('plans');
        });
        Schema::table('subscriptions', function (Blueprint $t): void {
            $t->string('owner_type', 20)->default('USER');
            $t->uuid('price_id')->nullable()->index();
            $t->timestampTz('trial_ends_at')->nullable();
            $t->timestampTz('current_period_start')->nullable();
            $t->timestampTz('cancel_at')->nullable();
            $t->timestampTz('ended_at')->nullable();
            $t->unsignedBigInteger('last_event_sequence')->default(0);
            $t->foreign('price_id')->references('id')->on('prices');
        });
        Schema::table('credit_wallets', function (Blueprint $t): void { $t->string('owner_type', 20)->default('USER'); });
        Schema::table('usage_events', function (Blueprint $t): void { $t->string('owner_type', 20)->default('USER')->index(); });
        Schema::table('orders', function (Blueprint $t): void { $t->string('owner_type', 20)->default('USER')->index(); });
        Schema::table('credit_ledger_entries', function (Blueprint $t): void {
            $t->uuid('lot_id')->nullable()->index();
            $t->string('operation', 50)->default('LEGACY');
            $t->string('idempotency_scope')->nullable()->unique();
            $t->json('safe_metadata')->nullable();
        });
        Schema::create('credit_lots', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->uuid('wallet_id')->index();
            $t->uuid('source_entry_id')->unique();
            $t->unsignedBigInteger('quantity_total');
            $t->unsignedBigInteger('quantity_remaining');
            $t->unsignedBigInteger('quantity_reserved')->default(0);
            $t->timestampTz('expires_at')->nullable()->index();
            $t->timestampsTz();
            $t->foreign('wallet_id')->references('id')->on('credit_wallets');
            $t->foreign('source_entry_id')->references('id')->on('credit_ledger_entries');
        });
        Schema::create('credit_reservations', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->uuid('wallet_id')->index();
            $t->unsignedBigInteger('quantity');
            $t->string('status', 20)->index();
            $t->string('reference')->index();
            $t->json('allocations');
            $t->timestampsTz();
            $t->foreign('wallet_id')->references('id')->on('credit_wallets');
            $t->unique(['wallet_id', 'reference']);
        });
        Schema::create('subscription_transitions', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->uuid('subscription_id')->index();
            $t->string('from_status', 30)->nullable();
            $t->string('to_status', 30);
            $t->string('source', 30);
            $t->string('external_event_id')->nullable();
            $t->unsignedBigInteger('event_sequence')->nullable();
            $t->json('safe_metadata');
            $t->timestampTz('occurred_at')->index();
            $t->foreign('subscription_id')->references('id')->on('subscriptions');
            $t->unique(['subscription_id', 'external_event_id']);
        });
        Schema::create('entitlement_grants', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->string('owner_type', 20);
            $t->uuid('owner_id')->index();
            $t->string('feature', 100);
            $t->unsignedBigInteger('limit_quantity')->nullable();
            $t->string('source_type', 30);
            $t->uuid('source_id')->nullable()->index();
            $t->timestampTz('valid_from');
            $t->timestampTz('valid_until')->nullable()->index();
            $t->timestampTz('revoked_at')->nullable();
            $t->timestampsTz();
            $t->index(['owner_type', 'owner_id', 'feature']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entitlement_grants');
        Schema::dropIfExists('subscription_transitions');
        Schema::dropIfExists('credit_reservations');
        Schema::dropIfExists('credit_lots');
        Schema::table('credit_ledger_entries', fn (Blueprint $t) => $t->dropColumn(['lot_id', 'operation', 'idempotency_scope', 'safe_metadata']));
        Schema::table('credit_wallets', fn (Blueprint $t) => $t->dropColumn('owner_type'));
        Schema::table('usage_events', fn (Blueprint $t) => $t->dropColumn('owner_type'));
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn('owner_type'));
        Schema::table('subscriptions', fn (Blueprint $t) => $t->dropColumn(['owner_type', 'price_id', 'trial_ends_at', 'current_period_start', 'cancel_at', 'ended_at', 'last_event_sequence']));
        Schema::table('prices', fn (Blueprint $t) => $t->dropColumn(['plan_id', 'interval', 'terms_version', 'archived_at']));
        Schema::table('plans', fn (Blueprint $t) => $t->dropColumn(['product_id', 'included_credits', 'active', 'terms_version', 'archived_at']));
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn(['description', 'purchase_mode', 'terms_version', 'archived_at']));
    }
};
