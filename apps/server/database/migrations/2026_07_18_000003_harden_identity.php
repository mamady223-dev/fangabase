<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('refresh_sessions', function (Blueprint $table): void {
            $table->char('ip_hash', 64)->nullable();
            $table->char('user_agent_hash', 64)->nullable();
            $table->timestampTz('last_used_at')->nullable()->index();
        });
        Schema::create('oauth_login_states', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->char('state_hash', 64)->unique();
            $table->text('verifier_encrypted');
            $table->char('nonce_hash', 64);
            $table->string('return_path', 2048);
            $table->timestampTz('expires_at')->index();
            $table->timestampTz('used_at')->nullable();
            $table->timestampsTz();
        });
        Schema::create('rate_limits', function (Blueprint $table): void {
            $table->char('scope_hash', 64)->primary();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestampTz('window_started_at');
            $table->timestampTz('blocked_until')->nullable()->index();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_limits');
        Schema::dropIfExists('oauth_login_states');
        Schema::table('refresh_sessions', function (Blueprint $table): void {
            $table->dropColumn(['ip_hash', 'user_agent_hash', 'last_used_at']);
        });
    }
};
