<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\CatalogService;
use FangaBase\Domain\Billing\CreditService;
use FangaBase\Domain\Billing\EntitlementService;
use FangaBase\Domain\Billing\SubscriptionService;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class BillingDomainTest extends TestCase
{
    private string $userId;
    protected function setUp(): void { parent::setUp(); Artisan::call('migrate:fresh', ['--force' => true]); $this->userId = (string) Str::uuid(); DB::table('users')->insert(['id' => $this->userId, 'email' => 'billing@example.test', 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()]); }

    public function test_catalog_uses_integer_server_price_and_archiving_preserves_history(): void
    {
        $ids = $this->catalog(); $price = app(CatalogService::class)->serverPrice($ids['priceId']); self::assertSame(2500, (int) $price->amount_minor); self::assertSame('XOF', $price->currency);
        app(CatalogService::class)->archivePrice($this->superadmin(), $ids['priceId']); self::assertSame(1, DB::table('prices')->where('id', $ids['priceId'])->count()); $this->expectException(ApiProblem::class); app(CatalogService::class)->serverPrice($ids['priceId']);
    }

    public function test_purchase_ignores_any_client_amount_and_is_idempotent(): void
    {
        $ids = $this->catalog(); $service = app(CreditService::class); $first = $service->purchase($this->scope(), $ids['priceId'], 'purchase-key-0001'); $again = $service->purchase($this->scope(), $ids['priceId'], 'purchase-key-0001');
        self::assertSame(2500, $first['amount_minor']); self::assertSame($first, $again); self::assertSame(100, $service->summary($this->scope())['balance']); self::assertSame(1, DB::table('credit_ledger_entries')->count());
    }

    public function test_same_idempotency_key_with_different_body_is_rejected(): void
    {
        $ids = $this->catalog(); $service = app(CreditService::class); $service->administrativeGrant($this->superadmin(), $this->scope(), 10, 'promotion', null, 'admin-grant-key-01'); $this->expectException(ApiProblem::class); $service->administrativeGrant($this->superadmin(), $this->scope(), 11, 'promotion', null, 'admin-grant-key-01');
    }

    public function test_reservation_prevents_double_debit_and_release_restores_balance(): void
    {
        $service = app(CreditService::class); $service->administrativeGrant($this->superadmin(), $this->scope(), 20, 'test', null, 'admin-grant-key-02'); $reservation = $service->reserve($this->scope(), 15, 'job-1', 'reserve-key-00001'); self::assertSame(5, $service->summary($this->scope())['balance']);
        try { $service->reserve($this->scope(), 10, 'job-2', 'reserve-key-00002'); self::fail('double debit accepted'); } catch (ApiProblem $e) { self::assertSame('INSUFFICIENT_CREDITS', $e->errorCode); }
        $service->settle($this->scope(), $reservation['reservation_id'], false); self::assertSame(20, $service->summary($this->scope())['balance']);
    }

    public function test_expired_credits_cannot_be_consumed(): void
    {
        DB::table('users')->where('id', $this->userId)->update(['role' => 'SUPERADMIN']); $service = app(CreditService::class); $service->administrativeGrant($this->superadmin(), $this->scope(), 10, 'expired', now()->subMinute(), 'admin-grant-key-03'); self::assertSame(0, $service->summary($this->scope())['balance']); $this->expectException(ApiProblem::class); $service->reserve($this->scope(), 1, 'job', 'reserve-key-00003');
    }

    public function test_admin_grant_requires_superadmin_and_is_audited(): void
    {
        $service = app(CreditService::class); try { $service->administrativeGrant(new AuthenticatedActor($this->userId, 'u@example.test', 'USER'), $this->scope(), 5, 'no', null, 'admin-grant-key-04'); self::fail('unauthorized grant'); } catch (ApiProblem $e) { self::assertSame(403, $e->status); }
        $service->administrativeGrant($this->superadmin(), $this->scope(), 5, 'support', null, 'admin-grant-key-05'); self::assertSame(1, DB::table('audit_events')->where('action', 'CREDITS_GRANTED')->count());
    }

    public function test_subscription_rejects_fraudulent_transition_and_ignores_old_events(): void
    {
        $ids = $this->catalog(); $service = app(SubscriptionService::class); $sub = $service->createPending($this->scope(), $ids['planId'], $ids['priceId']);
        try { $service->applyVerifiedEvent($sub['id'], 'event-1', 1, 'SUSPENDED'); self::fail('invalid transition'); } catch (ApiProblem $e) { self::assertSame('SUBSCRIPTION_TRANSITION_INVALID', $e->errorCode); }
        self::assertTrue($service->applyVerifiedEvent($sub['id'], 'event-2', 2, 'ACTIVE', now(), now()->addMonth())); self::assertFalse($service->applyVerifiedEvent($sub['id'], 'event-old', 1, 'PAST_DUE')); self::assertSame('ACTIVE', $service->current($this->scope())->status);
    }

    public function test_entitlement_expires_and_suspension_removes_all_rights(): void
    {
        DB::table('entitlement_grants')->insert(['id' => (string) Str::uuid(), 'owner_type' => 'USER', 'owner_id' => $this->userId, 'feature' => 'exports', 'limit_quantity' => 5, 'source_type' => 'ADMIN', 'valid_from' => now()->subDay(), 'valid_until' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]); $service = app(EntitlementService::class); self::assertTrue($service->has($this->scope(), 'exports'));
        DB::table('entitlement_grants')->where('owner_id', $this->userId)->update(['valid_until' => now()->subMinute()]); self::assertFalse($service->has($this->scope(), 'exports'));
        DB::table('entitlement_grants')->where('owner_id', $this->userId)->update(['valid_until' => now()->addDay()]); DB::table('users')->where('id', $this->userId)->update(['status' => 'SUSPENDED']); self::assertTrue($service->resolve($this->scope())['suspended']); self::assertSame([], $service->resolve($this->scope())['features']);
    }

    private function catalog(): array { return app(CatalogService::class)->create($this->superadmin(), ['slug' => 'credits', 'name' => 'Credits', 'description' => null, 'purchase_mode' => 'HYBRID', 'plan_slug' => 'starter', 'plan_name' => 'Starter', 'amount_minor' => 2500, 'currency' => 'XOF', 'interval' => 'MONTH', 'included_credits' => 100, 'features' => ['exports' => 10], 'terms_version' => 1]); }
    private function scope(): BillingScope { return new BillingScope('USER', $this->userId); }
    private function superadmin(): AuthenticatedActor { return new AuthenticatedActor($this->userId, 'admin@example.test', 'SUPERADMIN'); }
}
