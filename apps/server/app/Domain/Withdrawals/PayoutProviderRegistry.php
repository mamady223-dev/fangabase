<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use FangaBase\Support\ApiProblem;

final class PayoutProviderRegistry
{
    private array $providers = [];
    public function __construct(iterable $providers = []) { foreach ($providers as $provider) $this->providers[$provider->name()] = $provider; }
    public function require(string $name): PayoutProvider
    {
        $provider = $this->providers[$name] ?? null;
        if ($provider === null || $provider->activation() !== 'IMPLEMENTED_NEEDS_SANDBOX_UAT') throw ApiProblem::conflict('NEEDS_PROVIDER_CONTRACT');
        return $provider;
    }
    public function statuses(): array { return array_map(fn (PayoutProvider $provider): array => ['provider' => $provider->name(), 'status' => $provider->activation()], array_values($this->providers)); }
}
