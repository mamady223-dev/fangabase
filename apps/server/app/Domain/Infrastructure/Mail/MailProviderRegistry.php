<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

final class MailProviderRegistry
{
    /** @var array<string, TransactionalMailProvider> */
    private array $providers = [];
    /** @param iterable<TransactionalMailProvider> $providers */
    public function __construct(iterable $providers)
    {
        foreach ($providers as $provider) $this->providers[$provider->name()] = $provider;
    }
    public function get(string $name): ?TransactionalMailProvider { return $this->providers[$name] ?? null; }
}
