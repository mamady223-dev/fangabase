<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

final readonly class GoogleIdentity
{
    public function __construct(
        public string $subject,
        public string $email,
        public bool $emailVerified,
        public string $nonce,
        public string $issuer,
        public string $audience,
        public int $expiresAt,
    ) {}
}
