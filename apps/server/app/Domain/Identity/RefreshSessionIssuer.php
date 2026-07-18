<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RefreshSessionIssuer
{
    public function issue(string $userId, int $sessionVersion): string
    {
        $token = bin2hex(random_bytes(32));
        $now = now();

        DB::table('refresh_sessions')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'refresh_hash' => hash('sha256', $token),
            'session_version' => $sessionVersion,
            'expires_at' => $now->copy()->addDays((int) config('fangabase.refresh_days', 30)),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $token;
    }
}
