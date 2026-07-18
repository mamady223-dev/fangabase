<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class GoogleAccountLinker
{
    public function __construct(
        private readonly IdentityRepository $identities,
        private readonly RefreshSessionIssuer $sessions,
    ) {}

    /** @return array{user: array{id: string, email: string}, credentials: SessionCredentials} */
    public function link(GoogleIdentity $google): array
    {
        return DB::transaction(function () use ($google): array {
            $linked = DB::table('oauth_accounts')
                ->join('users', 'users.id', '=', 'oauth_accounts.user_id')
                ->where('oauth_accounts.provider', 'google')
                ->where('oauth_accounts.provider_subject', $google->subject)
                ->select('users.*')
                ->lockForUpdate()
                ->first();

            if ($linked !== null) {
                return $this->resultFor($linked);
            }

            $user = $this->identities->findByEmail($google->email);
            if ($user === null) {
                $created = $this->identities->createOAuthUser($google->email);
                $user = DB::table('users')->where('id', $created['id'])->lockForUpdate()->first();
            } else {
                DB::table('users')->where('id', $user->id)->whereNull('email_verified_at')->update([
                    'email_verified_at' => now(),
                    'updated_at' => now(),
                ]);
                $user = DB::table('users')->where('id', $user->id)->lockForUpdate()->first();
            }

            if ($user === null || $user->status !== 'ACTIVE') {
                throw ApiProblem::suspended();
            }

            DB::table('oauth_accounts')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'provider' => 'google',
                'provider_subject' => $google->subject,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->resultFor($user);
        });
    }

    /** @return array{user: array{id: string, email: string}, credentials: SessionCredentials} */
    private function resultFor(object $user): array
    {
        if ($user->status !== 'ACTIVE') {
            throw ApiProblem::suspended();
        }

        return [
            'user' => ['id' => (string) $user->id, 'email' => (string) $user->email],
            'credentials' => $this->sessions->issue((string) $user->id, (int) $user->session_version),
        ];
    }
}
