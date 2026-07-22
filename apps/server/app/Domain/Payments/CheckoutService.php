<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\CatalogService;
use FangaBase\Domain\Billing\PersistentIdempotency;
use FangaBase\Domain\Billing\SubscriptionService;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CheckoutService
{
    public function __construct(private CatalogService $catalog, private PersistentIdempotency $idempotency, private PaymentProviderRegistry $providers, private SubscriptionService $subscriptions) {}

    public function create(BillingScope $owner, string $priceId, string $providerName, string $purpose, string $returnPath, string $key): array
    {
        $this->assertOwner($owner); $this->assertReturnPath($returnPath);
        $price = $this->catalog->serverPrice($priceId);
        $capability = $purpose === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'ONE_TIME_PAYMENT';
        $provider = $this->providers->require($providerName, $capability, (string) $price->currency);
        return DB::transaction(fn (): array => $this->idempotency->execute($owner, 'CHECKOUT_CREATE', $providerName, $key,
            ['price_id' => $priceId, 'purpose' => $purpose, 'return_path' => $returnPath], function () use ($owner, $price, $provider, $providerName, $purpose, $returnPath, $key): array {
                $orderId = (string) Str::uuid(); $attemptId = (string) Str::uuid(); $now = now();
                DB::table('orders')->insert(['id' => $orderId, 'owner_id' => $owner->id, 'owner_type' => $owner->type, 'price_id' => $price->id,
                    'amount_minor' => (int) $price->amount_minor, 'currency' => strtoupper((string) $price->currency), 'provider' => $providerName,
                    'purpose' => $purpose, 'return_path' => $returnPath, 'status' => 'PENDING', 'expires_at' => now()->addMinutes((int) config('fangabase.payments.checkout_minutes', 30)), 'created_at' => $now, 'updated_at' => $now]);
                DB::table('payment_attempts')->insert(['id' => $attemptId, 'order_id' => $orderId, 'provider' => $providerName, 'status' => 'CREATED',
                    'idempotency_key' => $key, 'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR), 'created_at' => $now, 'updated_at' => $now]);
                $subscriptionId = null;
                if ($purpose === 'SUBSCRIPTION' && $price->plan_id !== null) {
                    $subscription = $this->subscriptions->createPending($owner, (string) $price->plan_id, (string) $price->id);
                    $subscriptionId = $subscription['id'];
                    DB::table('subscriptions')->where('id', $subscriptionId)->update(['provider' => $providerName, 'provider_reference' => 'order:'.$orderId, 'updated_at' => now()]);
                }
                try {
                    $payment = $provider->createCheckout(new CheckoutRequest($orderId, (int) $price->amount_minor, strtoupper((string) $price->currency),
                        rtrim((string) config('fangabase.public_origin'), '/').$returnPath, $key, $purpose, isset($price->interval) ? (string) $price->interval : null));
                } catch (\Throwable $error) {
                    DB::table('payment_attempts')->where('id', $attemptId)->update(['status' => 'FAILED', 'raw_status' => $this->safeError($error), 'updated_at' => now()]);
                    throw $error;
                }
                if ($payment->checkoutUrl === null || ! str_starts_with($payment->checkoutUrl, 'https://')) throw new \RuntimeException('PAYMENT_PROVIDER_INVALID_RESPONSE');
                DB::table('payment_attempts')->where('id', $attemptId)->update(['provider_reference' => $payment->reference, 'status' => 'PENDING', 'raw_status' => $payment->status, 'updated_at' => now()]);
                return ['order_id' => $orderId, 'attempt_id' => $attemptId, 'provider' => $providerName, 'status' => 'PENDING', 'checkout_url' => $payment->checkoutUrl,
                    'amount_minor' => (int) $price->amount_minor, 'currency' => strtoupper((string) $price->currency), 'subscription_id' => $subscriptionId];
            }));
    }

    private function assertOwner(BillingScope $owner): void
    {
        $table = $owner->type === 'ORGANIZATION' ? 'organizations' : 'users';
        $ownerRow = DB::table($table)->where('id', $owner->id)->first();
        if ($ownerRow === null) throw ApiProblem::notFound();
        if (($ownerRow->status ?? 'ACTIVE') !== 'ACTIVE') throw ApiProblem::forbidden();
    }

    private function assertReturnPath(string $path): void
    {
        $allowed = (array) config('fangabase.payments.allowed_return_paths', []);
        if (! str_starts_with($path, '/') || str_starts_with($path, '//') || parse_url($path, PHP_URL_HOST) !== null || ! in_array($path, $allowed, true)) throw ApiProblem::validation();
    }

    private function safeError(\Throwable $error): string
    {
        return in_array($error->getMessage(), ['PAYMENT_PROVIDER_TIMEOUT', 'PAYMENT_PROVIDER_TEMPORARY', 'PAYMENT_PROVIDER_REJECTED', 'PAYMENT_PROVIDER_INVALID_RESPONSE'], true)
            ? $error->getMessage() : 'PAYMENT_PROVIDER_ERROR';
    }
}
