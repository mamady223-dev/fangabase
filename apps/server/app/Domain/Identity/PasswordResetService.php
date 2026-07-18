<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\DB;

final class PasswordResetService
{
    public function __construct(
        private readonly IdentityRepository $identities,
        private readonly OneTimeTokenStore $tokens,
        private readonly IdentityMailOutbox $mail,
        private readonly PersistentRateLimiter $rateLimiter,
        private readonly PasswordPolicy $passwordPolicy,
    ) {}

    public function request(string $email, string $requestScope): void
    {
        $this->rateLimiter->assertAllowed($requestScope);
        $this->rateLimiter->hit($requestScope);
        $identity = $this->identities->findByEmail(strtolower(trim($email)));

        if ($identity === null) {
            return;
        }

        $token = $this->tokens->issue(
            OneTimeTokenStore::PASSWORD_RESET,
            (string) $identity->id,
            (int) config('fangabase.password_reset_minutes', 15),
        );
        $this->mail->enqueue('RESET_PASSWORD', (string) $identity->id, (string) $identity->email, $token);
    }

    public function reset(string $token, string $password): void
    {
        $passwordHash = $this->passwordPolicy->hash($password);

        DB::transaction(function () use ($token, $passwordHash): void {
            $userId = $this->tokens->consume(OneTimeTokenStore::PASSWORD_RESET, $token);
            DB::table('user_credentials')->where('user_id', $userId)->update([
                'password_hash' => $passwordHash,
                'updated_at' => now(),
            ]);
            DB::table('users')->where('id', $userId)->increment('session_version');
            DB::table('refresh_sessions')->where('user_id', $userId)->whereNull('revoked_at')->update([
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }
}
