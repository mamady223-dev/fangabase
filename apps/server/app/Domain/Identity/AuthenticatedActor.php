<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

final readonly class AuthenticatedActor
{
    public function __construct(
        public string $id,
        public string $email,
        public string $globalRole,
    ) {}
}
