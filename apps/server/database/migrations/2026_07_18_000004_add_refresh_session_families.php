<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('refresh_sessions', function (Blueprint $table): void {
            $table->uuid('family_id')->nullable()->index();
            $table->uuid('replaced_by_id')->nullable()->index();
            $table->char('csrf_hash', 64)->nullable();
            $table->timestampTz('rotated_at')->nullable()->index();
        });
        DB::table('refresh_sessions')->whereNull('family_id')->orderBy('id')->each(function (object $session): void {
            DB::table('refresh_sessions')->where('id', $session->id)->update(['family_id' => $session->id]);
        });
    }

    public function down(): void
    {
        Schema::table('refresh_sessions', function (Blueprint $table): void {
            $table->dropColumn(['family_id', 'replaced_by_id', 'csrf_hash', 'rotated_at']);
        });
    }
};
