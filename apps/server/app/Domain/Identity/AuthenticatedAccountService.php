<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final readonly class AuthenticatedAccountService
{
    public function __construct(private PasswordPolicy $passwordPolicy) {}

    /** @return array{id:string,email:string,role:string,status:string,email_verified_at:?string,name:string,locale:string} */
    public function current(AuthenticatedActor $actor): array
    {
        $user = DB::table('users')->where('id', $actor->id)->first();
        if (! $user) {
            throw ApiProblem::auth();
        }

        return [
            'id' => (string) $user->id,
            'email' => (string) $user->email,
            'role' => (string) $user->role,
            'status' => (string) $user->status,
            'email_verified_at' => $user->email_verified_at ? (string) $user->email_verified_at : null,
            'name' => (string) ($user->name ?? ''),
            'locale' => (string) ($user->locale ?? 'fr'),
        ];
    }

    public function changePassword(AuthenticatedActor $actor, string $currentPassword, string $newPassword): void
    {
        DB::transaction(function () use ($actor, $currentPassword, $newPassword): void {
            $credential = DB::table('user_credentials')->where('user_id', $actor->id)->lockForUpdate()->first();
            if (! $credential || ! $this->passwordPolicy->verify($currentPassword, (string) $credential->password_hash)) {
                throw ApiProblem::auth();
            }

            DB::table('user_credentials')->where('user_id', $actor->id)->update([
                'password_hash' => $this->passwordPolicy->hash($newPassword),
                'updated_at' => now(),
            ]);
            DB::table('users')->where('id', $actor->id)->increment('session_version');
            DB::table('refresh_sessions')->where('user_id', $actor->id)->whereNull('revoked_at')->update([
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('audit_events')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'actor_id' => $actor->id,
                'organization_id' => null,
                'action' => 'identity.password.changed',
                'target_type' => 'user',
                'target_id' => $actor->id,
                'reason' => null,
                'safe_metadata' => json_encode([], JSON_THROW_ON_ERROR),
                'occurred_at' => now(),
            ]);
        }, 3);
    }
}
