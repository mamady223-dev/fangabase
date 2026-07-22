<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\CatalogService;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\CheckoutService;
use FangaBase\Domain\Payments\PaymentProvider;
use FangaBase\Domain\Payments\PaymentProviderRegistry;
use FangaBase\Domain\Payments\PaymentReconciliationService;
use FangaBase\Domain\Payments\PaymentWebhookProcessor;
use FangaBase\Domain\Payments\MoneroPaymentService;
use FangaBase\Domain\Payments\MoneroWallet;
use FangaBase\Domain\Payments\ProviderDescriptor;
use FangaBase\Domain\Payments\ProviderPayment;
use FangaBase\Domain\Payments\ProviderRefund;
use FangaBase\Domain\Payments\RefundService;
use FangaBase\Domain\Payments\VerifiedPaymentEvent;
use FangaBase\Infrastructure\Payments\StripeWebhookVerifier;
use FangaBase\Support\ApiProblem;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PaymentDeliveryTest extends TestCase
{
    private string $userId;
    private array $catalog;

    protected function setUp(): void
    {
        parent::setUp(); Artisan::call('migrate:fresh', ['--force' => true]);
        $this->userId = (string) Str::uuid(); DB::table('users')->insert(['id' => $this->userId, 'email' => 'payer@example.test', 'status' => 'ACTIVE', 'role' => 'SUPERADMIN', 'created_at' => now(), 'updated_at' => now()]);
        $this->catalog = app(CatalogService::class)->create(new AuthenticatedActor($this->userId, 'payer@example.test', 'SUPERADMIN'),
            ['slug' => 'paid-credits', 'name' => 'Paid credits', 'description' => null, 'purchase_mode' => 'ONE_TIME', 'plan_slug' => 'paid', 'plan_name' => 'Paid',
                'amount_minor' => 2500, 'currency' => 'XOF', 'interval' => 'MONTH', 'included_credits' => 100, 'features' => [], 'terms_version' => 1]);
        config()->set('fangabase.payments.allowed_return_paths', ['/billing']);
    }

    public function test_checkout_uses_server_price_creates_internal_records_and_is_idempotent(): void
    {
        $provider = new TestPaymentProvider(); $this->registry($provider); $service = app(CheckoutService::class);
        $first = $service->create($this->scope(), $this->catalog['priceId'], 'test', 'CREDITS', '/billing', 'checkout-key-0001');
        $second = $service->create($this->scope(), $this->catalog['priceId'], 'test', 'CREDITS', '/billing', 'checkout-key-0001');
        self::assertSame($first, $second); self::assertSame(2500, $first['amount_minor']); self::assertSame(1, DB::table('orders')->count());
        self::assertSame(1, DB::table('payment_attempts')->count()); self::assertSame(1, $provider->checkoutCalls);
    }

    public function test_checkout_rejects_external_return_and_suspended_owner(): void
    {
        $this->registry(new TestPaymentProvider());
        try { app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'CREDITS', 'https://evil.test', 'checkout-key-0002'); self::fail('external redirect accepted'); }
        catch (ApiProblem $error) { self::assertSame(422, $error->status); }
        DB::table('users')->where('id', $this->userId)->update(['status' => 'SUSPENDED']);
        $this->expectException(ApiProblem::class); app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'CREDITS', '/billing', 'checkout-key-0003');
    }

    public function test_in_progress_idempotency_reservation_blocks_concurrent_checkout(): void
    {
        $provider = new TestPaymentProvider(); $this->registry($provider); $body = ['price_id' => $this->catalog['priceId'], 'purpose' => 'CREDITS', 'return_path' => '/billing']; ksort($body);
        DB::table('idempotency_keys')->insert(['id' => (string) Str::uuid(), 'owner_id' => $this->userId, 'operation' => 'CHECKOUT_CREATE', 'provider' => 'test',
            'idempotency_key' => 'checkout-concurrent-1', 'body_hash' => hash('sha256', json_encode($body, JSON_THROW_ON_ERROR)),
            'result' => json_encode(['__pending' => true], JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
        try { app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'CREDITS', '/billing', 'checkout-concurrent-1'); self::fail('concurrent checkout accepted'); }
        catch (ApiProblem $error) { self::assertSame('IDEMPOTENCY_IN_PROGRESS', $error->errorCode); }
        self::assertSame(0, $provider->checkoutCalls); self::assertSame(0, DB::table('orders')->count());
    }

    public function test_stripe_signature_raw_body_timestamp_and_tampering(): void
    {
        $raw = json_encode(['id' => 'evt_1', 'type' => 'checkout.session.completed', 'data' => ['object' => ['id' => 'cs_1', 'payment_intent' => 'pi_1',
            'client_reference_id' => (string) Str::uuid(), 'amount_total' => 2500, 'currency' => 'xof']]], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', '1000.'.$raw, 'webhook-secret'); $verifier = new StripeWebhookVerifier('webhook-secret');
        self::assertSame('SUCCEEDED', $verifier->verify($raw, ['stripe-signature' => 't=1000,v1='.$signature], 1000)->status);
        $this->expectException(\RuntimeException::class); $verifier->verify($raw.' ', ['stripe-signature' => 't=1000,v1='.$signature], 1000);
    }

    public function test_verified_webhook_is_atomic_checks_amount_and_ignores_replay(): void
    {
        $provider = new TestPaymentProvider(); $this->registry($provider);
        $checkout = app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'CREDITS', '/billing', 'checkout-key-0004');
        $bad = new VerifiedPaymentEvent('test', 'evt-bad', 'payment.completed', $checkout['order_id'], 'pay-1', 'SUCCEEDED', 1, 'XOF', 1);
        try { app(PaymentWebhookProcessor::class)->process($bad); self::fail('wrong amount accepted'); } catch (ApiProblem $error) { self::assertSame('PAYMENT_EVENT_MISMATCH', $error->errorCode); }
        self::assertSame(0, DB::table('webhook_events')->count());
        $event = new VerifiedPaymentEvent('test', 'evt-ok', 'payment.completed', $checkout['order_id'], 'pay-1', 'SUCCEEDED', 2500, 'XOF', 2);
        self::assertSame('PROCESSED', app(PaymentWebhookProcessor::class)->process($event)); self::assertSame('DUPLICATE', app(PaymentWebhookProcessor::class)->process($event));
        self::assertSame(1, DB::table('money_ledger_entries')->count()); self::assertSame(1, DB::table('outbox_events')->where('type', 'PAYMENT_SUCCEEDED')->count());
        self::assertSame(100, (int) DB::table('credit_ledger_entries')->sum('quantity_fixed'));
        $refund = app(RefundService::class)->request($this->scope(), $checkout['order_id'], 1000, 'partial credits refund', 'refund-credit-0001');
        self::assertSame('PROCESSING', $refund['status']); self::assertSame(60, (int) DB::table('credit_ledger_entries')->sum('quantity_fixed'));
        self::assertSame('CONFIRMED', app(RefundService::class)->confirm('test', 'refund-1', true)); self::assertSame(60, (int) DB::table('credit_ledger_entries')->sum('quantity_fixed'));
    }

    public function test_refund_never_confirms_early_and_forbids_over_refund(): void
    {
        $provider = new TestPaymentProvider(); $this->registry($provider);
        $checkout = app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'ONE_TIME', '/billing', 'checkout-key-0005');
        app(PaymentWebhookProcessor::class)->process(new VerifiedPaymentEvent('test', 'evt-paid', 'payment.completed', $checkout['order_id'], 'pay-1', 'SUCCEEDED', 2500, 'XOF', 1));
        $refund = app(RefundService::class)->request($this->scope(), $checkout['order_id'], 1000, 'customer request', 'refund-key-000001');
        self::assertSame('PROCESSING', $refund['status']); self::assertSame(0, (int) DB::table('orders')->where('id', $checkout['order_id'])->value('refunded_amount_minor'));
        self::assertSame('CONFIRMED', app(RefundService::class)->confirm('test', 'refund-1', true));
        try { app(RefundService::class)->request($this->scope(), $checkout['order_id'], 1600, 'too much', 'refund-key-000002'); self::fail('over refund accepted'); }
        catch (ApiProblem $error) { self::assertSame('REFUND_AMOUNT_INVALID', $error->errorCode); }
    }

    public function test_subscription_is_activated_only_by_verified_provider_event(): void
    {
        $this->registry(new TestPaymentProvider());
        $checkout = app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'SUBSCRIPTION', '/billing', 'checkout-sub-00001');
        self::assertNotNull($checkout['subscription_id']); self::assertSame('PENDING', DB::table('subscriptions')->where('id', $checkout['subscription_id'])->value('status'));
        app(PaymentWebhookProcessor::class)->process(new VerifiedPaymentEvent('test', 'evt-sub', 'subscription.payment', $checkout['order_id'], 'pay-sub', 'SUCCEEDED', 2500, 'XOF', 10));
        self::assertSame('ACTIVE', DB::table('subscriptions')->where('id', $checkout['subscription_id'])->value('status'));
    }

    public function test_official_status_reconciliation_can_confirm_without_browser(): void
    {
        $this->registry(new TestPaymentProvider());
        $checkout = app(CheckoutService::class)->create($this->scope(), $this->catalog['priceId'], 'test', 'ONE_TIME', '/billing', 'checkout-reconcile-1');
        self::assertSame('PROCESSED', app(PaymentReconciliationService::class)->reconcile($checkout['order_id']));
        self::assertSame('SUCCEEDED', DB::table('orders')->where('id', $checkout['order_id'])->value('status'));
    }

    public function test_monero_rate_is_locked_and_confirmation_handles_under_over_and_duplicates(): void
    {
        $wallet = new TestMoneroWallet(); $service = new MoneroPaymentService($wallet);
        $request = $service->create((string) Str::uuid(), 1000, 25, 1, 5);
        self::assertSame(1000, $request['amount_atomic']); self::assertSame(25, (int) DB::table('monero_payment_requests')->value('rate_numerator'));
        $wallet->received = [['amount_atomic' => 500, 'confirmations' => 10, 'tx_hash' => 'tx1']];
        self::assertSame('UNDERPAID', $service->reconcile($request['id']));
        $wallet->received = [['amount_atomic' => 1000, 'confirmations' => 10, 'tx_hash' => 'tx2']];
        self::assertSame('CONFIRMED', $service->reconcile($request['id'])); self::assertSame('CONFIRMED', $service->reconcile($request['id']));
        $other = $service->create((string) Str::uuid(), 1000, 25, 1, 5); $wallet->received = [['amount_atomic' => 1001, 'confirmations' => 10, 'tx_hash' => 'tx3']];
        self::assertSame('OVERPAID', $service->reconcile($other['id']));
    }

    private function registry(TestPaymentProvider $provider): void { $this->app->instance(PaymentProviderRegistry::class, new PaymentProviderRegistry([$provider])); }
    private function scope(): BillingScope { return new BillingScope('USER', $this->userId); }
}

final class TestPaymentProvider implements PaymentProvider
{
    public int $checkoutCalls = 0;
    public function descriptor(): ProviderDescriptor { return new ProviderDescriptor('test', ProviderDescriptor::IMPLEMENTED_NEEDS_SANDBOX_UAT,
        ['ONE_TIME_PAYMENT', 'SUBSCRIPTION', 'HOSTED_CHECKOUT', 'WEBHOOK', 'STATUS', 'FULL_REFUND', 'PARTIAL_REFUND'], ['XOF'], ['*']); }
    public function createCheckout(CheckoutRequest $request): ProviderPayment { $this->checkoutCalls++; return new ProviderPayment('checkout-1', 'PENDING', 'https://provider.test/pay', null, null); }
    public function paymentStatus(string $providerReference): ProviderPayment { return new ProviderPayment($providerReference, 'SUCCEEDED', null, 2500, 'XOF'); }
    public function requestRefund(string $providerReference, int $amountMinor, string $currency, string $idempotencyKey): ProviderRefund { return new ProviderRefund('refund-1', 'PROCESSING'); }
}

final class TestMoneroWallet implements MoneroWallet
{
    public array $received = [];
    public function createIntegratedAddress(string $paymentId): string { return '4'.str_repeat('A', 105); }
    public function payments(string $paymentId): array { return $this->received; }
}
