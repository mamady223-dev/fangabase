<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OneTimeTokenStore
{
    public const EMAIL_VERIFICATION = 'verification_codes';
    public const PASSWORD_RESET = 'password_reset_codes';

    public function issue(string $table, string $userId, int $ttlMinutes): string
    {
        $this->assertTable($table);
        $token = bin2hex(random_bytes(32));
        $now = now();

        DB::transaction(function () use ($table, $userId, $ttlMinutes, $token, $now): void {
            DB::table($table)
                ->where('user_id', $userId)
                ->whereNull('used_at')
                ->update(['used_at' => $now, 'updated_at' => $now]);
            DB::table($table)->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'code_hash' => hash('sha256', $token),
                'attempts' => 0,
                'expires_at' => $now->copy()->addMinutes($ttlMinutes),
                'used_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        return $token;
    }

    public function consume(string $table, string $token): string
    {
        $this->assertTable($table);

        return DB::transaction(function () use ($table, $token): string {
            $record = DB::table($table)
                ->where('code_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if ($record === null || $record->used_at !== null || now()->greaterThanOrEqualTo($record->expires_at)) {
                throw ApiProblem::tokenInvalid();
            }

            $updated = DB::table($table)
                ->where('id', $record->id)
                ->whereNull('used_at')
                ->update(['used_at' => now(), 'updated_at' => now()]);

            if ($updated !== 1) {
                throw ApiProblem::tokenInvalid();
            }

            return (string) $record->user_id;
        });
    }

    private function assertTable(string $table): void
    {
        if (! in_array($table, [self::EMAIL_VERIFICATION, self::PASSWORD_RESET], true)) {
            throw new \InvalidArgumentException('UNSUPPORTED_TOKEN_STORE');
        }
    }
}
