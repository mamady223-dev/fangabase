<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;

final class RegistrationService
{
    public function __construct(
        private readonly IdentityRepository $identities,
        private readonly PasswordPolicy $passwordPolicy,
    ) {}

    /** @return array{id: string, email: string} */
    public function register(string $email, string $password): array
    {
        $normalizedEmail = strtolower(trim($email));

        if ($this->identities->findByEmail($normalizedEmail) !== null) {
            throw ApiProblem::conflict('ACCOUNT_EXISTS');
        }

        return $this->identities->create($normalizedEmail, $this->passwordPolicy->hash($password));
    }
}
