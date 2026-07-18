<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('email', 254)->unique(); $t->string('role', 20)->default('USER'); $t->string('status', 20)->default('ACTIVE'); $t->unsignedInteger('session_version')->default(1); $t->timestamp('email_verified_at')->nullable(); $t->timestampsTz(); });
        Schema::create('user_credentials', function (Blueprint $t): void { $t->uuid('user_id')->primary(); $t->string('password_hash'); $t->string('withdrawal_pin_hash')->nullable(); $t->foreign('user_id')->references('id')->on('users'); $t->timestampsTz(); });
        Schema::create('refresh_sessions', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('user_id')->index(); $t->char('refresh_hash', 64)->unique(); $t->unsignedInteger('session_version'); $t->timestampTz('expires_at')->index(); $t->timestampTz('revoked_at')->nullable(); $t->timestampsTz(); $t->foreign('user_id')->references('id')->on('users'); });
        Schema::create('oauth_accounts', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('user_id')->index(); $t->string('provider', 40); $t->string('provider_subject', 255); $t->timestampsTz(); $t->unique(['provider','provider_subject']); $t->foreign('user_id')->references('id')->on('users'); });
        foreach (['verification_codes','password_reset_codes'] as $name) Schema::create($name, function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('user_id')->index(); $t->char('code_hash', 64)->unique(); $t->unsignedSmallInteger('attempts')->default(0); $t->timestampTz('expires_at')->index(); $t->timestampTz('used_at')->nullable(); $t->timestampsTz(); $t->foreign('user_id')->references('id')->on('users'); });
        Schema::create('organizations', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('name'); $t->string('slug')->unique(); $t->timestampsTz(); });
        Schema::create('organization_members', function (Blueprint $t): void { $t->uuid('organization_id'); $t->uuid('user_id'); $t->string('role', 20); $t->timestampsTz(); $t->primary(['organization_id','user_id']); $t->foreign('organization_id')->references('id')->on('organizations'); $t->foreign('user_id')->references('id')->on('users'); });
        Schema::create('audit_events', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('actor_id')->nullable()->index(); $t->uuid('organization_id')->nullable()->index(); $t->string('action', 100); $t->string('target_type', 100); $t->string('target_id'); $t->text('reason')->nullable(); $t->json('safe_metadata'); $t->timestampTz('occurred_at')->index(); });
        Schema::create('admin_actions', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('admin_id')->index(); $t->string('action'); $t->string('target_id'); $t->text('reason'); $t->timestampTz('created_at')->index(); });
        Schema::create('notification_preferences', function (Blueprint $t): void { $t->uuid('user_id')->primary(); $t->boolean('marketing_email')->default(false); $t->boolean('product_email')->default(true); $t->timestampsTz(); });
        Schema::create('notifications', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('user_id')->index(); $t->string('type'); $t->json('payload'); $t->timestampTz('read_at')->nullable(); $t->timestampsTz(); });
        Schema::create('files', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id')->index(); $t->string('disk'); $t->string('path')->unique(); $t->string('mime', 100); $t->unsignedBigInteger('size'); $t->boolean('is_public')->default(false); $t->timestampsTz(); });
        foreach (['email_jobs','outbox_events'] as $name) Schema::create($name, function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('idempotency_key')->unique(); $t->string('type'); $t->json('payload'); $t->string('status', 20)->default('PENDING')->index(); $t->unsignedSmallInteger('attempts')->default(0); $t->timestampTz('available_at')->index(); $t->timestampTz('claimed_until')->nullable()->index(); $t->text('last_error_code')->nullable(); $t->timestampsTz(); });
        Schema::create('webhook_events', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->string('provider', 40); $t->string('external_event_id'); $t->string('event_type'); $t->string('status', 20)->index(); $t->json('safe_payload')->nullable(); $t->timestampTz('received_at')->index(); $t->unique(['provider','external_event_id','event_type']); });
        Schema::create('idempotency_keys', function (Blueprint $t): void { $t->uuid('id')->primary(); $t->uuid('owner_id'); $t->string('operation', 80); $t->string('provider', 40); $t->string('idempotency_key', 128); $t->char('body_hash', 64); $t->json('result'); $t->timestampsTz(); $t->unique(['owner_id','operation','provider','idempotency_key']); });
    }
    public function down(): void { foreach (['idempotency_keys','webhook_events','outbox_events','email_jobs','files','notifications','notification_preferences','admin_actions','audit_events','organization_members','organizations','password_reset_codes','verification_codes','oauth_accounts','refresh_sessions','user_credentials','users'] as $name) Schema::dropIfExists($name); }
};
