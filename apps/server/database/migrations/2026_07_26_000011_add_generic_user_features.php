<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('name', 120)->default('');
            $table->string('locale', 10)->default('fr');
        });
        Schema::table('notification_preferences', function (Blueprint $table): void {
            $table->boolean('in_app')->default(true);
        });
        Schema::table('files', function (Blueprint $table): void {
            $table->string('original_name', 180)->default('file');
            $table->char('checksum', 64)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table): void {
            $table->dropColumn(['original_name', 'checksum']);
        });
        Schema::table('notification_preferences', function (Blueprint $table): void {
            $table->dropColumn('in_app');
        });
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['name', 'locale']);
        });
    }
};
