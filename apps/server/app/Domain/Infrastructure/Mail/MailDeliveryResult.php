<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

final readonly class MailDeliveryResult
{
    private function __construct(
        public bool $delivered,
        public bool $retryable,
        public string $code,
        public ?string $providerMessageId = null,
        public ?int $retryAfterSeconds = null,
    ) {}

    public static function sent(string $providerMessageId): self { return new self(true, false, 'SENT', $providerMessageId); }
    public static function temporary(string $code, ?int $retryAfterSeconds = null): self { return new self(false, true, $code, null, $retryAfterSeconds); }
    public static function permanent(string $code): self { return new self(false, false, $code); }
    public static function disabled(): self { return new self(false, false, 'PROVIDER_DISABLED'); }
}
