<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Domain\Withdrawals\PayoutAccountService;
use FangaBase\Domain\Withdrawals\PayoutCallbackProcessor;
use FangaBase\Domain\Withdrawals\PayoutPollingService;
use FangaBase\Domain\Withdrawals\PayoutProvider;
use FangaBase\Domain\Withdrawals\PayoutProviderRegistry;
use FangaBase\Domain\Withdrawals\PayoutResult;
use FangaBase\Domain\Withdrawals\PayoutWorker;
use FangaBase\Domain\Withdrawals\WithdrawalLedger;
use FangaBase\Domain\Withdrawals\WithdrawalReconciliationService;
use FangaBase\Domain\Withdrawals\WithdrawalService;
use FangaBase\Infrastructure\Withdrawals\ConfiguredHmacPayoutCallbackVerifier;
use FangaBase\Infrastructure\Withdrawals\UnavailablePayoutProvider;
use FangaBase\Support\ApiProblem;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Route;

final class WithdrawalPersistenceTest extends TestCase
{
    private string $userId; private string $otherId; private string $accountId; private TestPayoutProvider $provider;
    protected function setUp(): void
    {
        parent::setUp(); Artisan::call('migrate:fresh', ['--force' => true]); config()->set('fangabase.withdrawals.callback_secrets.test', 'callback-secret');
        $this->userId = (string) Str::uuid(); $this->otherId = (string) Str::uuid();
        foreach ([[$this->userId, 'owner@example.test', 'SUPERADMIN'], [$this->otherId, 'other@example.test', 'USER']] as [$id, $email, $role]) DB::table('users')->insert(['id' => $id, 'email' => $email, 'role' => $role, 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()]);
        $account = app(PayoutAccountService::class)->create($this->scope(), 'test', 'SN', 'XOF', ['phone' => '+221700000000']); $this->accountId = $account['id'];
        app(PayoutAccountService::class)->setStatus($this->admin(), $this->accountId, 'VERIFIED', 'identity checked');
        app(WithdrawalLedger::class)->append($this->scope(), 10000, 'XOF', 'PAYMENT', (string) Str::uuid(), 'seed:balance');
        $this->provider = new TestPayoutProvider(); $this->app->instance(PayoutProviderRegistry::class, new PayoutProviderRegistry([$this->provider]));
    }

    public function test_normal_withdrawal_reserves_approves_and_pays_once(): void
    {
        $item = $this->request('withdrawal-key-0001'); self::assertSame(8000, app(WithdrawalLedger::class)->available($this->scope(), 'XOF'));
        app(WithdrawalService::class)->startVerification($this->admin(), $item['id']); app(WithdrawalService::class)->approve($this->admin(), $item['id']);
        self::assertSame(1, app(PayoutWorker::class)->runOnce()); self::assertSame('PAID', DB::table('withdrawals')->where('id', $item['id'])->value('status'));
        self::assertSame(8000, app(WithdrawalLedger::class)->available($this->scope(), 'XOF')); self::assertSame(1, DB::table('outbox_events')->where('type', 'WITHDRAWAL_PAID')->count());
    }

    public function test_invalid_amount_currency_and_insufficient_balance_are_rejected(): void
    {
        foreach ([[0, 'XOF'], [1000, 'EUR'], [20000, 'XOF']] as [$amount, $currency]) {
            try { app(WithdrawalService::class)->request($this->scope(), $this->accountId, $amount, $currency, 'invalid-key-'.Str::uuid()); self::fail('invalid withdrawal accepted'); }
            catch (ApiProblem $error) { self::assertContains($error->errorCode, ['VALIDATION_FAILED', 'INSUFFICIENT_BALANCE']); }
        }
    }

    public function test_double_submission_and_in_progress_concurrency_do_not_double_reserve(): void
    {
        $first = $this->request('withdrawal-key-0002'); $again = $this->request('withdrawal-key-0002'); self::assertSame($first, $again);
        self::assertSame(1, DB::table('withdrawals')->count()); self::assertSame(1, DB::table('money_ledger_entries')->where('kind', 'WITHDRAWAL_RESERVE')->count());
    }

    public function test_cancel_releases_reserve_and_forbids_invalid_transition(): void
    {
        $item = $this->request('withdrawal-key-0003'); self::assertSame('CANCELLED', app(WithdrawalService::class)->cancel($this->scope(), $item['id'])['status']);
        self::assertSame(10000, app(WithdrawalLedger::class)->available($this->scope(), 'XOF'));
        $this->expectException(ApiProblem::class); app(WithdrawalService::class)->cancel($this->scope(), $item['id']);
    }

    public function test_provider_failure_retries_with_redacted_error_then_releases_at_limit(): void
    {
        config()->set('fangabase.withdrawals.max_attempts', 2); $this->provider->throw = true; $item = $this->approved('withdrawal-key-0004');
        app(PayoutWorker::class)->runOnce(); DB::table('withdrawals')->where('id', $item['id'])->update(['available_at' => now()->subSecond(), 'claimed_until' => null]); app(PayoutWorker::class)->runOnce();
        $row = DB::table('withdrawals')->where('id', $item['id'])->first(); self::assertSame('FAILED', $row->status); self::assertSame('PAYOUT_PROVIDER_ERROR', $row->last_error_code);
        self::assertSame(10000, app(WithdrawalLedger::class)->available($this->scope(), 'XOF'));
    }

    public function test_signed_callback_rejects_tampering_and_is_idempotent(): void
    {
        $this->provider->status = 'PENDING'; $item = $this->approved('withdrawal-key-0005'); app(PayoutWorker::class)->runOnce();
        $raw = json_encode(['event_id' => 'evt-1', 'event_type' => 'payout.updated', 'withdrawal_id' => $item['id'], 'reference' => 'payout-'.$item['id'], 'status' => 'PAID'], JSON_THROW_ON_ERROR);
        $sig = hash_hmac('sha256', '1000.'.$raw, 'callback-secret'); $verifier = new ConfiguredHmacPayoutCallbackVerifier(new PayoutProviderRegistry([$this->provider]));
        try { $verifier->verify('test', $raw, [], 1000); self::fail('unsigned callback accepted'); } catch (\RuntimeException $error) { self::assertSame('PAYOUT_CALLBACK_REJECTED', $error->getMessage()); }
        try { $verifier->verify('test', $raw.'x', ['x-fangabase-timestamp' => '1000', 'x-fangabase-signature' => $sig], 1000); self::fail('tampered callback accepted'); } catch (\RuntimeException $error) { self::assertSame('PAYOUT_CALLBACK_REJECTED', $error->getMessage()); }
        $event = $verifier->verify('test', $raw, ['x-fangabase-timestamp' => '1000', 'x-fangabase-signature' => $sig], 1000);
        self::assertSame('PAID', app(PayoutCallbackProcessor::class)->process($event)); self::assertSame('DUPLICATE', app(PayoutCallbackProcessor::class)->process($event));
    }

    public function test_repeated_polling_is_monotonic(): void
    {
        $this->provider->status = 'PENDING'; $item = $this->approved('withdrawal-key-0006'); app(PayoutWorker::class)->runOnce();
        self::assertSame('PENDING', app(PayoutPollingService::class)->poll($item['id'])); self::assertSame('PENDING', app(PayoutPollingService::class)->poll($item['id']));
        $this->provider->status = 'PAID'; self::assertSame('PAID', app(PayoutPollingService::class)->poll($item['id'])); self::assertSame(1, DB::table('money_ledger_entries')->where('kind', 'WITHDRAWAL_PAID')->count());
    }

    public function test_tenant_isolation_idor_suspension_and_audit(): void
    {
        $item = $this->request('withdrawal-key-0007');
        try { app(WithdrawalService::class)->cancel(new BillingScope('USER', $this->otherId), $item['id']); self::fail('IDOR accepted'); } catch (ApiProblem $error) { self::assertSame(404, $error->status); }
        app(PayoutAccountService::class)->setStatus($this->admin(), $this->accountId, 'SUSPENDED', 'risk review');
        try { app(WithdrawalService::class)->startVerification($this->admin(), $item['id']); self::fail('suspended payout account accepted'); } catch (ApiProblem $error) { self::assertSame('PAYOUT_ACCOUNT_SUSPENDED', $error->errorCode); }
        app(PayoutAccountService::class)->setStatus($this->admin(), $this->accountId, 'VERIFIED', 'risk cleared');
        DB::table('users')->where('id', $this->userId)->update(['status' => 'SUSPENDED']);
        try { app(WithdrawalService::class)->startVerification($this->admin(), $item['id']); self::fail('suspended owner accepted'); } catch (ApiProblem $error) { self::assertSame('WITHDRAWAL_OWNER_SUSPENDED', $error->errorCode); }
        self::assertGreaterThan(0, DB::table('audit_events')->count()); self::assertStringNotContainsString('+221', (string) DB::table('audit_events')->value('safe_metadata'));
    }

    public function test_reconciliation_detects_ledger_gap_without_destructive_correction(): void
    {
        $item = $this->approved('withdrawal-key-0008'); app(PayoutWorker::class)->runOnce(); DB::table('money_ledger_entries')->where(['reference_id' => $item['id'], 'kind' => 'WITHDRAWAL_PAID'])->delete();
        $report = app(WithdrawalReconciliationService::class)->run('test'); self::assertSame(1, $report['anomalies']); self::assertSame('PAID_LEDGER_MISMATCH', DB::table('reconciliation_anomalies')->value('code'));
    }

    public function test_sensitive_withdrawal_routes_require_session_and_csrf(): void
    {
        $route = collect(Route::getRoutes())->first(fn ($route) => $route->uri() === 'api/withdrawals' && in_array('POST', $route->methods(), true));
        self::assertNotNull($route); self::assertContains('session.auth', $route->gatherMiddleware()); self::assertContains('strict.csrf', $route->gatherMiddleware());
    }

    public function test_unverified_provider_contract_blocks_approval(): void
    {
        $item = $this->request('withdrawal-key-0009'); app(WithdrawalService::class)->startVerification($this->admin(), $item['id']);
        $this->app->instance(PayoutProviderRegistry::class, new PayoutProviderRegistry([new UnavailablePayoutProvider('test')]));
        $this->expectException(ApiProblem::class); app(WithdrawalService::class)->approve($this->admin(), $item['id']);
    }

    private function request(string $key): array { return app(WithdrawalService::class)->request($this->scope(), $this->accountId, 2000, 'XOF', $key); }
    private function approved(string $key): array { $item = $this->request($key); app(WithdrawalService::class)->startVerification($this->admin(), $item['id']); app(WithdrawalService::class)->approve($this->admin(), $item['id']); return $item; }
    private function scope(): BillingScope { return new BillingScope('USER', $this->userId); }
    private function admin(): AuthenticatedActor { return new AuthenticatedActor($this->userId, 'owner@example.test', 'SUPERADMIN'); }
}

final class TestPayoutProvider implements PayoutProvider
{
    public string $status = 'PAID'; public bool $throw = false;
    public function name(): string { return 'test'; } public function activation(): string { return 'IMPLEMENTED_NEEDS_SANDBOX_UAT'; }
    public function initiate(string $withdrawalId, int $amountMinor, string $currency, array $destination, string $idempotencyKey): PayoutResult { if ($this->throw) throw new \RuntimeException('secret destination leaked'); return new PayoutResult('payout-'.$withdrawalId, $this->status); }
    public function status(string $providerReference): PayoutResult { return new PayoutResult($providerReference, $this->status); }
    public function cancel(string $providerReference): PayoutResult { return new PayoutResult($providerReference, 'FAILED'); }
}
