<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OAuthStateStore
{
    public function issue(string $returnPath): OAuthState
    {
        $allowedPaths = config('fangabase.google.allowed_return_paths', ['/', '/dashboard']);
        if (! is_array($allowedPaths) || ! in_array($returnPath, $allowedPaths, true)) {
            throw ApiProblem::oauthInvalid();
        }

        $state = $this->randomUrlToken(32);
        $nonce = $this->randomUrlToken(32);
        $verifier = $this->randomUrlToken(64);
        $challenge = $this->base64Url(hash('sha256', $verifier, true));
        $now = now();

        DB::table('oauth_login_states')->insert([
            'id' => (string) Str::uuid(),
            'state_hash' => hash('sha256', $state),
            'verifier_encrypted' => Crypt::encryptString($verifier),
            'nonce_hash' => hash('sha256', $nonce),
            'return_path' => $returnPath,
            'expires_at' => $now->copy()->addMinutes((int) config('fangabase.google.state_minutes', 10)),
            'used_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return new OAuthState($state, $nonce, $verifier, $challenge, $returnPath);
    }

    public function consume(string $state): ConsumedOAuthState
    {
        return DB::transaction(function () use ($state): ConsumedOAuthState {
            $record = DB::table('oauth_login_states')
                ->where('state_hash', hash('sha256', $state))
                ->lockForUpdate()
                ->first();

            if ($record === null || $record->used_at !== null || now()->greaterThanOrEqualTo($record->expires_at)) {
                throw ApiProblem::oauthInvalid();
            }
            $updated = DB::table('oauth_login_states')->where('id', $record->id)->whereNull('used_at')->update([
                'used_at' => now(),
                'updated_at' => now(),
            ]);
            if ($updated !== 1) {
                throw ApiProblem::oauthInvalid();
            }

            return new ConsumedOAuthState(
                Crypt::decryptString((string) $record->verifier_encrypted),
                (string) $record->nonce_hash,
                (string) $record->return_path,
            );
        });
    }

    private function randomUrlToken(int $bytes): string
    {
        return $this->base64Url(random_bytes($bytes));
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
