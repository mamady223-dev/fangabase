<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payout_accounts', function (Blueprint $table): void {
            $table->text('encrypted_details')->change();
        });
    }

    public function down(): void
    {
        Schema::table('payout_accounts', function (Blueprint $table): void {
            $table->string('encrypted_details', 255)->change();
        });
    }
};
