<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Identity;

use FangaBase\Domain\Identity\GoogleIdentity;
use FangaBase\Domain\Identity\GoogleOAuthProvider;
use FangaBase\Support\ApiProblem;
use Google\Client;

final class OfficialGoogleOAuthProvider implements GoogleOAuthProvider
{
    public function authorizationUrl(string $state, string $nonce, string $codeChallenge): string
    {
        $client = $this->client();
        $client->setState($state);

        return $client->createAuthUrl(null, [
            'nonce' => $nonce,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]);
    }

    public function exchange(string $code, string $codeVerifier, string $expectedNonceHash): GoogleIdentity
    {
        try {
            $client = $this->client();
            $token = $client->fetchAccessTokenWithAuthCode($code, $codeVerifier);
            if (isset($token['error']) || ! isset($token['id_token'])) {
                throw ApiProblem::oauthInvalid();
            }
            $claims = $client->verifyIdToken((string) $token['id_token']);
            if (! is_array($claims)) {
                throw ApiProblem::oauthInvalid();
            }

            $issuer = (string) ($claims['iss'] ?? '');
            $audience = (string) ($claims['aud'] ?? '');
            $expiresAt = (int) ($claims['exp'] ?? 0);
            $nonce = (string) ($claims['nonce'] ?? '');
            $emailVerified = filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
            if (! in_array($issuer, ['https://accounts.google.com', 'accounts.google.com'], true)
                || ! hash_equals((string) config('fangabase.google.client_id'), $audience)
                || $expiresAt <= time()
                || ! hash_equals($expectedNonceHash, hash('sha256', $nonce))
                || ! $emailVerified
                || empty($claims['sub'])
                || empty($claims['email'])) {
                throw ApiProblem::oauthInvalid();
            }

            return new GoogleIdentity(
                (string) $claims['sub'],
                strtolower((string) $claims['email']),
                true,
                $nonce,
                $issuer,
                $audience,
                $expiresAt,
            );
        } catch (ApiProblem $problem) {
            throw $problem;
        } catch (\Throwable) {
            throw ApiProblem::oauthInvalid();
        }
    }

    private function client(): Client
    {
        $clientId = config('fangabase.google.client_id');
        $clientSecret = config('fangabase.google.client_secret');
        $redirectUri = config('fangabase.google.redirect_uri');
        if (! is_string($clientId) || $clientId === '' || ! is_string($clientSecret) || $clientSecret === '' || ! is_string($redirectUri) || $redirectUri === '') {
            throw ApiProblem::oauthInvalid();
        }

        $client = new Client();
        $client->setClientId($clientId);
        $client->setClientSecret($clientSecret);
        $client->setRedirectUri($redirectUri);
        $client->setScopes(['openid', 'email', 'profile']);
        $client->setPrompt('select_account');

        return $client;
    }
}
