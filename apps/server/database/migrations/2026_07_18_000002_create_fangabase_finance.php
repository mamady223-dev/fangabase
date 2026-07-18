<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('slug')->unique(); $t->string('name'); $t->boolean('active')->default(true)->index(); $t->timestampsTz(); });
        Schema::create('prices', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('product_id')->index(); $t->unsignedBigInteger('amount_minor'); $t->char('currency',3); $t->boolean('active')->default(true); $t->timestampsTz(); $t->foreign('product_id')->references('id')->on('products'); });
        Schema::create('plans', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('slug')->unique(); $t->string('name'); $t->unsignedBigInteger('amount_minor'); $t->char('currency',3); $t->string('interval',20); $t->json('entitlements'); $t->timestampsTz(); });
        Schema::create('subscriptions', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->uuid('plan_id'); $t->string('provider',40); $t->string('provider_reference'); $t->string('status',30)->index(); $t->timestampTz('current_period_end')->nullable(); $t->timestampsTz(); $t->unique(['provider','provider_reference']); });
        Schema::create('credit_wallets', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id'); $t->string('unit',30)->default('credit'); $t->timestampsTz(); $t->unique(['owner_id','unit']); });
        Schema::create('credit_ledger_entries', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('wallet_id')->index(); $t->bigInteger('quantity_fixed'); $t->unsignedSmallInteger('scale')->default(0); $t->string('kind',30); $t->string('reference')->index(); $t->timestampTz('occurred_at')->index(); $t->foreign('wallet_id')->references('id')->on('credit_wallets'); });
        Schema::create('usage_events', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->string('meter'); $t->unsignedBigInteger('quantity'); $t->string('idempotency_key')->unique(); $t->timestampTz('occurred_at')->index(); });
        Schema::create('orders', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->uuid('price_id')->nullable(); $t->unsignedBigInteger('amount_minor'); $t->char('currency',3); $t->string('provider',40); $t->string('status',30)->index(); $t->timestampTz('expires_at')->nullable()->index(); $t->timestampsTz(); });
        Schema::create('payment_attempts', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('order_id')->index(); $t->string('provider',40); $t->string('provider_reference')->nullable(); $t->string('status',30)->index(); $t->string('raw_status')->nullable(); $t->json('safe_metadata'); $t->timestampsTz(); $t->unique(['provider','provider_reference']); });
        Schema::create('refunds', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('payment_attempt_id')->index(); $t->unsignedBigInteger('amount_minor'); $t->char('currency',3); $t->string('provider_reference')->nullable(); $t->string('status',30)->index(); $t->text('reason'); $t->timestampsTz(); });
        Schema::create('payout_accounts', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->string('provider',40); $t->string('country',2); $t->string('encrypted_details'); $t->timestampTz('verified_at')->nullable(); $t->timestampsTz(); });
        Schema::create('withdrawals', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->uuid('payout_account_id'); $t->unsignedBigInteger('amount_minor'); $t->char('currency',3); $t->string('status',30)->index(); $t->string('provider_reference')->nullable(); $t->timestampTz('approved_at')->nullable(); $t->timestampsTz(); });
        Schema::create('money_ledger_entries', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->unsignedBigInteger('amount_minor'); $t->char('currency',3); $t->string('kind',30); $t->string('reference_type',50); $t->uuid('reference_id')->index(); $t->timestampTz('occurred_at')->index(); });
        Schema::create('reconciliation_runs', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('provider',40)->index(); $t->string('status',30); $t->json('report'); $t->timestampTz('started_at'); $t->timestampTz('finished_at')->nullable(); });
    }
    public function down(): void { foreach (['reconciliation_runs','money_ledger_entries','withdrawals','payout_accounts','refunds','payment_attempts','orders','usage_events','credit_ledger_entries','credit_wallets','subscriptions','plans','prices','products'] as $name) Schema::dropIfExists($name); }
};
