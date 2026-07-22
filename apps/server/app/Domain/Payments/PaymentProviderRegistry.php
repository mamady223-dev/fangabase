<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Support\ApiProblem;

final class PaymentProviderRegistry
{
    /** @var array<string, PaymentProvider> */
    private array $providers = [];

    public function __construct(iterable $providers = [])
    {
        foreach ($providers as $provider) {
            $name = $provider->descriptor()->name;
            if (isset($this->providers[$name])) throw ApiProblem::conflict('PAYMENT_PROVIDER_DUPLICATE');
            $this->providers[$name] = $provider;
        }
    }

    public function require(string $name, string $capability, string $currency): PaymentProvider
    {
        $provider = $this->providers[$name] ?? null;
        if ($provider === null || ! $provider->descriptor()->supports($capability, $currency)) {
            throw ApiProblem::conflict('PAYMENT_PROVIDER_UNAVAILABLE');
        }
        return $provider;
    }

    public function statuses(): array
    {
        return array_map(fn (PaymentProvider $provider): ProviderDescriptor => $provider->descriptor(), array_values($this->providers));
    }
}
