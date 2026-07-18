<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final class RefreshSessionService
{
    public function __construct(private readonly RefreshSessionIssuer $issuer) {}

    /** @return array{user_id: string, credentials: SessionCredentials} */
    public function rotate(string $refreshToken, string $csrfToken): array
    {
        try {
            $result = DB::transaction(function () use ($refreshToken, $csrfToken): ?array {
                $session = $this->findLocked($refreshToken);
                if ($session->rotated_at !== null) {
                    $this->revokeFamily((string) $session->family_id);
                    return null;
                }
                $this->assertUsable($session, $csrfToken);

            $updated = DB::table('refresh_sessions')
                ->where('id', $session->id)
                ->whereNull('rotated_at')
                ->whereNull('revoked_at')
                ->update(['rotated_at' => now(), 'revoked_at' => now(), 'updated_at' => now()]);
            if ($updated !== 1) {
                $this->revokeFamily((string) $session->family_id);
                return null;
            }

            $credentials = $this->issuer->issue(
                (string) $session->user_id,
                (int) $session->session_version,
                (string) $session->family_id,
            );
            $replacementId = DB::table('refresh_sessions')
                ->where('refresh_hash', hash('sha256', $credentials->refreshToken))
                ->value('id');
            DB::table('refresh_sessions')->where('id', $session->id)->update([
                'replaced_by_id' => $replacementId,
                'updated_at' => now(),
            ]);

                return ['user_id' => (string) $session->user_id, 'credentials' => $credentials];
            });
        } catch (ApiProblem $problem) {
            if ($problem->errorCode === 'ACCOUNT_SUSPENDED') {
                $this->revokeUserSessionsForToken($refreshToken);
            }
            throw $problem;
        }

        if ($result === null) {
            throw ApiProblem::sessionReplay();
        }

        return $result;
    }

    public function logoutCurrent(string $refreshToken, string $csrfToken): void
    {
        DB::transaction(function () use ($refreshToken, $csrfToken): void {
            $session = $this->findLocked($refreshToken);
            $this->assertUsable($session, $csrfToken);
            DB::table('refresh_sessions')->where('id', $session->id)->update([
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function logoutAll(string $refreshToken, string $csrfToken): void
    {
        DB::transaction(function () use ($refreshToken, $csrfToken): void {
            $session = $this->findLocked($refreshToken);
            $this->assertUsable($session, $csrfToken);
            DB::table('users')->where('id', $session->user_id)->increment('session_version');
            DB::table('refresh_sessions')->where('user_id', $session->user_id)->whereNull('revoked_at')->update([
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function cleanupExpired(): int
    {
        return DB::table('refresh_sessions')->where('expires_at', '<', now())->delete();
    }

    private function findLocked(string $refreshToken): object
    {
        $session = DB::table('refresh_sessions')
            ->where('refresh_hash', hash('sha256', $refreshToken))
            ->lockForUpdate()
            ->first();

        if ($session === null) {
            throw ApiProblem::auth();
        }

        return $session;
    }

    private function assertUsable(object $session, string $csrfToken): void
    {
        if ($session->revoked_at !== null || now()->greaterThanOrEqualTo($session->expires_at)) {
            throw ApiProblem::auth();
        }
        if (! hash_equals((string) $session->csrf_hash, hash('sha256', $csrfToken))) {
            throw ApiProblem::csrf();
        }

        $user = DB::table('users')->where('id', $session->user_id)->lockForUpdate()->first();
        if ($user === null || $user->status !== 'ACTIVE' || (int) $user->session_version !== (int) $session->session_version) {
            throw $user !== null && $user->status !== 'ACTIVE' ? ApiProblem::suspended() : ApiProblem::auth();
        }
    }

    private function revokeFamily(string $familyId): void
    {
        DB::table('refresh_sessions')->where('family_id', $familyId)->whereNull('revoked_at')->update([
            'revoked_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function revokeUserSessionsForToken(string $refreshToken): void
    {
        $userId = DB::table('refresh_sessions')
            ->where('refresh_hash', hash('sha256', $refreshToken))
            ->value('user_id');
        if ($userId !== null) {
            DB::table('refresh_sessions')->where('user_id', $userId)->whereNull('revoked_at')->update([
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
