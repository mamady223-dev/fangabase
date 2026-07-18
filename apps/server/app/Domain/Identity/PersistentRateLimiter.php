<?php

declare(strict_types=1);

namespace FangaBase\Domain\Identity;

use Carbon\CarbonImmutable;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final class PersistentRateLimiter
{
    public function assertAllowed(string $scope, int $limit = 5, int $windowSeconds = 300): void
    {
        DB::transaction(function () use ($scope, $windowSeconds): void {
            $key = $this->key($scope);
            $record = DB::table('rate_limits')->where('scope_hash', $key)->lockForUpdate()->first();

            if ($record === null) {
                return;
            }

            if ($record->blocked_until !== null && CarbonImmutable::parse((string) $record->blocked_until)->isFuture()) {
                throw ApiProblem::limited();
            }

            $windowStartedAt = CarbonImmutable::parse((string) $record->window_started_at);

            if ($windowStartedAt->addSeconds($windowSeconds)->isPast()) {
                DB::table('rate_limits')->where('scope_hash', $key)->delete();
            }
        });
    }

    public function hit(string $scope, int $limit = 5, int $windowSeconds = 300): void
    {
        DB::transaction(function () use ($scope, $limit, $windowSeconds): void {
            $key = $this->key($scope);
            $now = CarbonImmutable::now();
            $record = DB::table('rate_limits')->where('scope_hash', $key)->lockForUpdate()->first();

            if ($record === null) {
                DB::table('rate_limits')->insert([
                    'scope_hash' => $key,
                    'attempts' => 1,
                    'window_started_at' => $now,
                    'blocked_until' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                return;
            }

            $windowStartedAt = CarbonImmutable::parse((string) $record->window_started_at);

            if ($windowStartedAt->addSeconds($windowSeconds)->isPast()) {
                DB::table('rate_limits')->where('scope_hash', $key)->update([
                    'attempts' => 1,
                    'window_started_at' => $now,
                    'blocked_until' => null,
                    'updated_at' => $now,
                ]);

                return;
            }

            $attempts = (int) $record->attempts + 1;

            DB::table('rate_limits')->where('scope_hash', $key)->update([
                'attempts' => $attempts,
                'blocked_until' => $attempts >= $limit ? $now->addSeconds($windowSeconds) : null,
                'updated_at' => $now,
            ]);
        });
    }

    public function clear(string $scope): void
    {
        DB::table('rate_limits')->where('scope_hash', $this->key($scope))->delete();
    }

    private function key(string $scope): string
    {
        return hash('sha256', $scope);
    }
}
