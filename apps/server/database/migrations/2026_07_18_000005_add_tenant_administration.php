<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table): void {
            $table->string('status', 20)->default('ACTIVE')->index();
            $table->timestampTz('suspended_at')->nullable();
        });
        Schema::table('organization_members', function (Blueprint $table): void {
            $table->string('status', 20)->default('ACTIVE')->index();
            $table->timestampTz('suspended_at')->nullable();
            $table->index(['user_id', 'status']);
            $table->index(['organization_id', 'status', 'role']);
        });
        Schema::create('organization_invitations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('invited_by');
            $table->string('email', 254);
            $table->string('role', 20);
            $table->char('token_hash', 64)->unique();
            $table->string('status', 20)->default('PENDING')->index();
            $table->timestampTz('expires_at')->index();
            $table->timestampTz('responded_at')->nullable();
            $table->timestampsTz();
            $table->index(['organization_id', 'email', 'status']);
            $table->foreign('organization_id')->references('id')->on('organizations');
            $table->foreign('invited_by')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_invitations');
        Schema::table('organization_members', function (Blueprint $table): void {
            $table->dropColumn(['status', 'suspended_at']);
        });
        Schema::table('organizations', function (Blueprint $table): void {
            $table->dropColumn(['status', 'suspended_at']);
        });
    }
};
