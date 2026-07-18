<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

final readonly class ConsumedOAuthState
{
    public function __construct(
        public string $codeVerifier,
        public string $nonceHash,
        public string $returnPath,
    ) {}
}
