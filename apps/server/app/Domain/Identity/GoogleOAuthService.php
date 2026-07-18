<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;

final class GoogleOAuthService
{
    public function __construct(
        private readonly OAuthStateStore $states,
        private readonly GoogleOAuthProvider $provider,
        private readonly GoogleAccountLinker $accounts,
    ) {}

    public function start(string $returnPath): string
    {
        $state = $this->states->issue($returnPath);

        return $this->provider->authorizationUrl($state->state, $state->nonce, $state->codeChallenge);
    }

    /** @return array{user: array{id: string, email: string}, credentials: SessionCredentials, return_path: string} */
    public function callback(string $code, string $state): array
    {
        $consumed = $this->states->consume($state);
        $identity = $this->provider->exchange($code, $consumed->codeVerifier, $consumed->nonceHash);
        $clientId = (string) config('fangabase.google.client_id');

        if (! $identity->emailVerified
            || ! in_array($identity->issuer, ['https://accounts.google.com', 'accounts.google.com'], true)
            || $identity->audience === ''
            || ! hash_equals($clientId, $identity->audience)
            || $identity->expiresAt <= time()
            || ! hash_equals($consumed->nonceHash, hash('sha256', $identity->nonce))) {
            throw ApiProblem::oauthInvalid();
        }

        $linked = $this->accounts->link($identity);

        return $linked + ['return_path' => $consumed->returnPath];
    }
}
