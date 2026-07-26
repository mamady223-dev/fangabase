<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Payments\CheckoutRequest;
use FangaBase\Domain\Payments\OrangeMoneyMlGateway;
use FangaBase\Infrastructure\Payments\OrangeMoneyMlPaymentProvider;
use FangaBase\Infrastructure\Payments\OrangeMoneyMlSimulator;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\DataProvider;

final class OrangeMoneyMlProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'array']);
        Cache::clear();
    }

    public function test_provider_is_disabled_without_selection(): void
    {
        $provider = new OrangeMoneyMlPaymentProvider(new OrangeMoneyMlSimulator(), $this->configuration(enabled: false));
        $this->expectExceptionMessage('PAYMENT_PROVIDER_NOT_CONFIGURED');
        $provider->createCheckout($this->request());
    }

    #[DataProvider('statuses')]
    public function test_simulator_normalizes_observed_and_unknown_statuses(string $raw, string $expected): void
    {
        $provider = new OrangeMoneyMlPaymentProvider(
            new OrangeMoneyMlSimulator(['status' => $raw]),
            $this->configuration(),
        );
        $created = $provider->createCheckout($this->request());
        $status = $provider->paymentStatus($created->reference, $created->safeMetadata);

        self::assertSame($expected, $status->status);
        self::assertStringStartsWith('https://orange-money-ml.simulator.invalid/', (string) $created->checkoutUrl);
        self::assertStringNotContainsString('sim-pay-', json_encode($created->safeMetadata, JSON_THROW_ON_ERROR));
        self::assertArrayHasKey('encrypted_tokens', $created->safeMetadata);
    }

    public static function statuses(): array
    {
        return [
            'success' => ['SUCCESS', 'SUCCEEDED'],
            'pending' => ['PENDING', 'PENDING'],
            'failed' => ['FAILED', 'FAILED'],
            'cancelled' => ['CANCELLED', 'CANCELLED'],
            'unknown' => ['UNDOCUMENTED_VALUE', 'NEEDS_REVIEW'],
        ];
    }

    public function test_contract_values_are_required_outside_simulator(): void
    {
        $configuration = $this->configuration();
        $configuration['environment'] = 'sandbox';
        $provider = new OrangeMoneyMlPaymentProvider(new OrangeMoneyMlSimulator(), $configuration);
        $this->expectExceptionMessage('PAYMENT_PROVIDER_NOT_CONFIGURED');
        $provider->createCheckout($this->request());
    }

    public function test_timeout_is_explicit_and_does_not_expose_credentials(): void
    {
        $configuration = $this->configuration();
        $configuration['simulator_scenario'] = 'timeout';
        $provider = new OrangeMoneyMlPaymentProvider(new OrangeMoneyMlSimulator(), $configuration);
        $this->expectExceptionMessage('PAYMENT_PROVIDER_TIMEOUT');
        $provider->createCheckout($this->request());
    }

    public function test_oauth_refusal_is_explicit(): void
    {
        $configuration = $this->configuration();
        $configuration['simulator_scenario'] = 'oauth_refused';
        $provider = new OrangeMoneyMlPaymentProvider(new OrangeMoneyMlSimulator(), $configuration);
        $this->expectExceptionMessage('PAYMENT_PROVIDER_REJECTED');
        $provider->createCheckout($this->request());
    }

    public function test_oauth_token_respects_expires_in_and_is_reused(): void
    {
        $gateway = new class implements OrangeMoneyMlGateway
        {
            public int $oauthCalls = 0;

            public function oauth(array $configuration): array
            {
                $this->oauthCalls++;

                return ['access_token' => 'oauth-test-value', 'expires_in' => 3600];
            }

            public function checkout(array $configuration, string $accessToken, CheckoutRequest $request): array
            {
                return ['status' => 'PENDING', 'reference' => $request->orderId, 'payment_url' => 'https://orange-money-ml.simulator.invalid/'.$request->orderId];
            }

            public function status(array $configuration, string $accessToken, string $providerReference, array $context): array
            {
                return ['status' => 'PENDING', 'reference' => $providerReference];
            }
        };
        $provider = new OrangeMoneyMlPaymentProvider($gateway, $this->configuration());
        $provider->createCheckout($this->request());
        $provider->createCheckout(new CheckoutRequest('22222222-2222-4222-8222-222222222222', 2500, 'XOF', 'https://app.example.invalid/billing', 'second-key', 'ONE_TIME', null));

        self::assertSame(1, $gateway->oauthCalls);
    }

    private function configuration(bool $enabled = true): array
    {
        return [
            'enabled' => $enabled,
            'environment' => 'simulator',
            'country' => 'ML',
            'currency' => 'XOF',
            'oauth_token_url' => '',
            'api_base_url' => '',
            'client_id' => '',
            'client_secret' => '',
            'merchant_account' => '',
            'merchant_code' => '',
            'merchant_key' => '',
            'return_url' => '',
            'cancel_url' => '',
            'notification_url' => '',
            'timeout_seconds' => 1,
            'simulator_scenario' => 'pending',
        ];
    }

    private function request(): CheckoutRequest
    {
        return new CheckoutRequest('11111111-1111-4111-8111-111111111111', 2500, 'XOF', 'https://app.example.invalid/billing', 'idempotency-key', 'ONE_TIME', null);
    }
}
