<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

interface GoogleOAuthProvider
{
    public function authorizationUrl(string $state, string $nonce, string $codeChallenge): string;

    public function exchange(string $code, string $codeVerifier, string $expectedNonceHash): GoogleIdentity;
}
