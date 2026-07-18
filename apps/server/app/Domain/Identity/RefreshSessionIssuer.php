<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RefreshSessionIssuer
{
    public function issue(string $userId, int $sessionVersion, ?string $familyId = null): SessionCredentials
    {
        $refreshToken = bin2hex(random_bytes(32));
        $csrfToken = bin2hex(random_bytes(32));
        $now = now();
        $sessionId = (string) Str::uuid();
        $refreshDays = (int) config('fangabase.refresh_days', 30);

        DB::table('refresh_sessions')->insert([
            'id' => $sessionId,
            'user_id' => $userId,
            'family_id' => $familyId ?? $sessionId,
            'refresh_hash' => hash('sha256', $refreshToken),
            'csrf_hash' => hash('sha256', $csrfToken),
            'session_version' => $sessionVersion,
            'expires_at' => $now->copy()->addDays($refreshDays),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return new SessionCredentials($refreshToken, $csrfToken, $refreshDays * 24 * 60);
    }
}
