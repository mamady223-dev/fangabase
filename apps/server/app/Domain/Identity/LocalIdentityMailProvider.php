<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

final class LocalIdentityMailProvider
{
    public function latestToken(string $email, string $type): string
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('LOCAL_MAIL_PROVIDER_DISABLED');
        }

        $table = match ($type) {
            'VERIFY_EMAIL' => OneTimeTokenStore::EMAIL_VERIFICATION,
            'RESET_PASSWORD' => OneTimeTokenStore::PASSWORD_RESET,
            default => throw new \InvalidArgumentException('UNSUPPORTED_LOCAL_MAIL_TYPE'),
        };
        $activeHashes = DB::table($table)->whereNull('used_at')->pluck('code_hash')->all();
        $jobs = DB::table('email_jobs')->where('type', $type)->get();
        foreach ($jobs as $job) {
            $payload = json_decode((string) $job->payload, true, flags: JSON_THROW_ON_ERROR);
            if (($payload['recipient'] ?? null) === strtolower($email)) {
                $token = Crypt::decryptString((string) $payload['token_encrypted']);
                if (in_array(hash('sha256', $token), $activeHashes, true)) {
                    return $token;
                }
            }
        }

        throw new \RuntimeException('LOCAL_MAIL_NOT_FOUND');
    }
}
