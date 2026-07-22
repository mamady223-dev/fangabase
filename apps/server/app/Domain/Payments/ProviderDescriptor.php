<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

final readonly class ProviderDescriptor
{
    public const IMPLEMENTED_NEEDS_SANDBOX_UAT = 'IMPLEMENTED_NEEDS_SANDBOX_UAT';
    public const NEEDS_PROVIDER_CONTRACT = 'NEEDS_PROVIDER_CONTRACT';
    public const DISABLED = 'DISABLED';
    public const UNSUPPORTED = 'UNSUPPORTED';

    public function __construct(
        public string $name,
        public string $activation,
        public array $capabilities,
        public array $currencies,
        public array $countries,
    ) {
        if (! in_array($activation, [self::IMPLEMENTED_NEEDS_SANDBOX_UAT, self::NEEDS_PROVIDER_CONTRACT, self::DISABLED, self::UNSUPPORTED], true)) {
            throw new \InvalidArgumentException('PAYMENT_PROVIDER_STATUS_INVALID');
        }
    }

    public function supports(string $capability, string $currency): bool
    {
        return $this->activation === self::IMPLEMENTED_NEEDS_SANDBOX_UAT
            && in_array($capability, $this->capabilities, true)
            && (in_array('*', $this->currencies, true) || in_array(strtoupper($currency), $this->currencies, true));
    }
}
