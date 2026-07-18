<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Billing\CreditService;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class BillingAdminController
{
    use ResolvesActor;
    public function grant(Request $request, CreditService $credits): JsonResponse { $actor = $this->actor($request); $data = $request->validate(['owner_type' => ['required', 'in:USER,ORGANIZATION'], 'owner_id' => ['required', 'uuid'], 'quantity' => ['required', 'integer', 'min:1'], 'reason' => ['required', 'string', 'min:3', 'max:500'], 'expires_at' => ['nullable', 'date', 'after:now']]); return response()->json($credits->administrativeGrant($actor, new BillingScope($data['owner_type'], $data['owner_id']), $data['quantity'], $data['reason'], isset($data['expires_at']) ? new \DateTimeImmutable($data['expires_at']) : null, (string) $request->header('Idempotency-Key')), 201); }
    public function events(Request $request): JsonResponse { $actor = $this->actor($request); if (! in_array($actor->globalRole, ['ADMIN', 'SUPERADMIN'], true)) throw ApiProblem::forbidden(); $data = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]); $page = (int) ($data['page'] ?? 1); $per = (int) ($data['per_page'] ?? 25); $query = DB::table('credit_ledger_entries')->orderByDesc('occurred_at'); return response()->json(['data' => $query->forPage($page, $per)->get()->all(), 'page' => $page, 'per_page' => $per, 'total' => $query->count()]); }
}
