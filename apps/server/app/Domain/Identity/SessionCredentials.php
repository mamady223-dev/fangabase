<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

final readonly class SessionCredentials
{
    public function __construct(
        public string $refreshToken,
        public string $csrfToken,
        public int $expiresInMinutes,
    ) {}
}
