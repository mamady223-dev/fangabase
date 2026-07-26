<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Support\ApiProblem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class OperationsAdminController
{
    use ResolvesActor;

    public function audit(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        return response()->json(['data' => DB::table('audit_events')->orderByDesc('occurred_at')->limit($this->limit($request))->get()]);
    }

    public function outbox(Request $request): JsonResponse
    {
        $this->assertAdmin($request);
        $rows = DB::table('outbox_events')->select(['id', 'idempotency_key', 'type', 'status', 'attempts', 'available_at', 'claimed_until', 'last_error_code', 'created_at'])->orderByDesc('created_at')->limit($this->limit($request))->get();

        return response()->json(['data' => $rows]);
    }

    public function rateLimits(Request $request): JsonResponse
    {
        $this->assertAdmin($request);
        $rows = DB::table('rate_limits')->orderByDesc('updated_at')->limit($this->limit($request))->get()->map(fn (object $row): array => [
            'key_hash' => (string) $row->scope_hash,
            'attempts' => (int) $row->attempts,
            'window_started_at' => $row->window_started_at,
            'blocked_until' => $row->blocked_until,
        ]);

        return response()->json(['data' => $rows]);
    }

    private function assertAdmin(Request $request): void
    {
        if ($this->actor($request)->globalRole !== 'SUPERADMIN') {
            throw ApiProblem::forbidden();
        }
    }

    private function limit(Request $request): int
    {
        return max(1, min((int) $request->query('limit', 25), 100));
    }
}
