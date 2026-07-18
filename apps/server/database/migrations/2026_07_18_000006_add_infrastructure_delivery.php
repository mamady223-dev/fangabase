<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('email_jobs', function (Blueprint $table): void {
            $table->string('provider_message_id')->nullable()->index();
            $table->timestampTz('sent_at')->nullable();
            $table->timestampTz('dead_at')->nullable();
        });
        Schema::create('email_job_attempts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('email_job_id')->index();
            $table->unsignedSmallInteger('attempt');
            $table->string('provider', 40);
            $table->string('outcome', 20);
            $table->string('safe_error_code')->nullable();
            $table->string('provider_message_id')->nullable();
            $table->timestampTz('occurred_at')->index();
            $table->foreign('email_job_id')->references('id')->on('email_jobs');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_job_attempts');
        Schema::table('email_jobs', function (Blueprint $table): void {
            $table->dropColumn(['provider_message_id', 'sent_at', 'dead_at']);
        });
    }
};
