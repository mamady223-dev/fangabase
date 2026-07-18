<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class IdentityRepository
{
    public function findByEmail(string $email): ?object
    {
        return DB::table('users')
            ->leftJoin('user_credentials', 'users.id', '=', 'user_credentials.user_id')
            ->select('users.*', 'user_credentials.password_hash')
            ->where('users.email', $email)
            ->first();
    }

    /** @return array{id: string, email: string} */
    public function create(string $email, string $passwordHash): array
    {
        $id = (string) Str::uuid();
        $now = now();

        DB::transaction(function () use ($id, $email, $passwordHash, $now): void {
            DB::table('users')->insert([
                'id' => $id,
                'email' => $email,
                'role' => 'USER',
                'status' => 'ACTIVE',
                'session_version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('user_credentials')->insert([
                'user_id' => $id,
                'password_hash' => $passwordHash,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        return ['id' => $id, 'email' => $email];
    }

    /** @return array{id: string, email: string} */
    public function createOAuthUser(string $email): array
    {
        $id = (string) Str::uuid();
        $now = now();
        DB::table('users')->insert([
            'id' => $id,
            'email' => strtolower($email),
            'role' => 'USER',
            'status' => 'ACTIVE',
            'session_version' => 1,
            'email_verified_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return ['id' => $id, 'email' => strtolower($email)];
    }
}
