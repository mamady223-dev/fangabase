<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t): void {
            $t->string('purpose', 30)->default('ONE_TIME');
            $t->string('return_path', 255)->nullable();
            $t->unsignedBigInteger('refunded_amount_minor')->default(0);
            $t->timestampTz('paid_at')->nullable();
        });
        Schema::table('payment_attempts', function (Blueprint $t): void {
            $t->string('idempotency_key', 128)->nullable();
            $t->timestampTz('confirmed_at')->nullable();
        });
        Schema::table('refunds', function (Blueprint $t): void {
            $t->uuid('owner_id')->nullable()->index();
            $t->string('idempotency_key', 128)->nullable();
            $t->timestampTz('confirmed_at')->nullable();
            $t->timestampTz('failed_at')->nullable();
            $t->uuid('credit_reservation_id')->nullable()->index();
            $t->unique(['payment_attempt_id', 'idempotency_key']);
        });
        Schema::create('payment_transitions', function (Blueprint $t): void {
            $t->uuid('id')->primary(); $t->uuid('order_id')->index(); $t->string('from_status', 30)->nullable(); $t->string('to_status', 30);
            $t->string('source', 30); $t->string('external_event_id')->nullable(); $t->json('safe_metadata'); $t->timestampTz('occurred_at')->index();
            $t->unique(['order_id', 'external_event_id', 'to_status']);
        });
        Schema::create('monero_payment_requests', function (Blueprint $t): void {
            $t->uuid('id')->primary(); $t->uuid('order_id')->unique(); $t->char('payment_id_hash', 64)->unique(); $t->text('payment_id_encrypted');
            $t->string('address'); $t->unsignedBigInteger('expected_atomic'); $t->unsignedBigInteger('received_atomic')->default(0);
            $t->unsignedBigInteger('confirmed_atomic')->default(0); $t->unsignedBigInteger('rate_numerator'); $t->unsignedBigInteger('rate_denominator');
            $t->unsignedSmallInteger('minimum_confirmations'); $t->string('status', 30)->index(); $t->timestampTz('expires_at')->index(); $t->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monero_payment_requests');
        Schema::dropIfExists('payment_transitions');
        Schema::table('refunds', function (Blueprint $t): void { $t->dropUnique(['payment_attempt_id', 'idempotency_key']); $t->dropColumn(['owner_id', 'idempotency_key', 'confirmed_at', 'failed_at', 'credit_reservation_id']); });
        Schema::table('payment_attempts', fn (Blueprint $t) => $t->dropColumn(['idempotency_key', 'confirmed_at']));
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['purpose', 'return_path', 'refunded_amount_minor', 'paid_at']));
    }
};
