<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;

final class PasswordPolicy
{
    private const FORBIDDEN_PASSWORDS = [
        'password',
        'motdepasse',
        '123456789012',
        'azertyuiop',
        'qwertyuiop',
    ];

    private const DUMMY_HASH = '$2y$12$u2qjBlzgRnfnpQHtGQ9f7eu6Bv8Z6vMZxgb1vIloO3iTQkL8FjN3u';

    public function validate(string $password): void
    {
        $validLength = strlen($password) >= 12 && strlen($password) <= 128;
        $containsLetter = preg_match('/[A-Za-z]/', $password) === 1;
        $containsDigit = preg_match('/\d/', $password) === 1;
        $isForbidden = in_array(strtolower($password), self::FORBIDDEN_PASSWORDS, true);

        if (! $validLength || ! $containsLetter || ! $containsDigit || $isForbidden) {
            throw ApiProblem::validation();
        }
    }

    public function hash(string $password): string
    {
        $this->validate($password);

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        if (! is_string($hash)) {
            throw new \RuntimeException('PASSWORD_HASH_FAILED');
        }

        return $hash;
    }

    public function verify(string $password, ?string $hash): bool
    {
        return password_verify($password, $hash ?? self::DUMMY_HASH);
    }
}
