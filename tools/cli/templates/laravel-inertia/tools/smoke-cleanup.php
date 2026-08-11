<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$email = (string) ($argv[1] ?? '');
if ($app->environment('production') || ! str_ends_with($email, '@example.invalid')) {
    fwrite(STDERR, "Nettoyage smoke refusé.\n");
    exit(1);
}

$user = DB::table('users')->where('email', $email)->first(['id']);
if ($user === null) {
    exit(0);
}

$userId = (string) $user->id;
DB::transaction(function () use ($userId): void {
    foreach (['refresh_sessions', 'oauth_accounts', 'verification_codes', 'password_reset_codes', 'organization_members', 'notification_preferences', 'notifications', 'user_credentials'] as $table) {
        if (Schema::hasTable($table)) {
            DB::table($table)->where('user_id', $userId)->delete();
        }
    }
    if (Schema::hasTable('audit_events')) {
        DB::table('audit_events')->where('actor_id', $userId)->delete();
    }
    if (Schema::hasTable('outbox_events')) {
        DB::table('outbox_events')->where('aggregate_id', $userId)->delete();
    }
    DB::table('users')->where('id', $userId)->delete();
});
