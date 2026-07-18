<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\DB;

final class EmailVerificationService
{
    public function __construct(
        private readonly IdentityRepository $identities,
        private readonly OneTimeTokenStore $tokens,
        private readonly IdentityMailOutbox $mail,
        private readonly PersistentRateLimiter $rateLimiter,
    ) {}

    public function request(string $email, string $requestScope): void
    {
        $this->rateLimiter->assertAllowed($requestScope);
        $this->rateLimiter->hit($requestScope);
        $identity = $this->identities->findByEmail(strtolower(trim($email)));

        if ($identity === null || $identity->email_verified_at !== null) {
            return;
        }

        $token = $this->tokens->issue(
            OneTimeTokenStore::EMAIL_VERIFICATION,
            (string) $identity->id,
            (int) config('fangabase.verification_minutes', 15),
        );
        $this->mail->enqueue('VERIFY_EMAIL', (string) $identity->id, (string) $identity->email, $token);
    }

    public function confirm(string $token): void
    {
        $userId = $this->tokens->consume(OneTimeTokenStore::EMAIL_VERIFICATION, $token);
        DB::table('users')->where('id', $userId)->whereNull('email_verified_at')->update([
            'email_verified_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
