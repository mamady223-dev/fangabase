<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;

final class LoginService
{
    public function __construct(
        private readonly IdentityRepository $identities,
        private readonly PasswordPolicy $passwordPolicy,
        private readonly PersistentRateLimiter $rateLimiter,
        private readonly RefreshSessionIssuer $sessions,
    ) {}

    /** @return array{user: array{id: string, email: string}, refresh_token: string} */
    public function login(string $email, string $password): array
    {
        $normalizedEmail = strtolower(trim($email));
        $scope = 'login:'.$normalizedEmail;
        $this->rateLimiter->assertAllowed($scope);
        $identity = $this->identities->findByEmail($normalizedEmail);

        if ($identity === null || ! $this->passwordPolicy->verify($password, $identity->password_hash)) {
            $this->rateLimiter->hit($scope);
            throw ApiProblem::auth();
        }
        if ($identity->status !== 'ACTIVE') {
            throw ApiProblem::suspended();
        }

        $this->rateLimiter->clear($scope);

        return [
            'user' => ['id' => (string) $identity->id, 'email' => (string) $identity->email],
            'refresh_token' => $this->sessions->issue((string) $identity->id, (int) $identity->session_version),
        ];
    }
}
