<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

final class MigrationTest extends TestCase
{
    public function testAllRequiredTablesMigrateOnSqlite(): void
    {
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
        foreach (['users','organizations','outbox_events','webhook_events','idempotency_keys','orders','credit_ledger_entries','withdrawals','money_ledger_entries','reconciliation_runs'] as $table) self::assertTrue(Schema::hasTable($table), $table);
    }
}
