<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

final readonly class OAuthState
{
    public function __construct(
        public string $state,
        public string $nonce,
        public string $codeVerifier,
        public string $codeChallenge,
        public string $returnPath,
    ) {}
}
