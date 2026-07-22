<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Withdrawals\PayoutAccountService;
use FangaBase\Domain\Withdrawals\WithdrawalReconciliationService;
use FangaBase\Domain\Withdrawals\WithdrawalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use FangaBase\Support\ApiProblem;

final class WithdrawalAdminController
{
    use ResolvesActor;
    public function index(Request $request, WithdrawalService $service): JsonResponse { $data = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]); return response()->json($service->adminList($this->actor($request), (int) ($data['page'] ?? 1), (int) ($data['per_page'] ?? 25))); }
    public function verify(Request $request, string $withdrawal, WithdrawalService $service): JsonResponse { return response()->json($service->startVerification($this->actor($request), $withdrawal)); }
    public function approve(Request $request, string $withdrawal, WithdrawalService $service): JsonResponse { return response()->json($service->approve($this->actor($request), $withdrawal)); }
    public function account(Request $request, string $account, PayoutAccountService $service): JsonResponse { $data = $request->validate(['status' => ['required', 'in:VERIFIED,SUSPENDED'], 'reason' => ['required', 'string', 'min:3', 'max:500']]); return response()->json($service->setStatus($this->actor($request), $account, $data['status'], $data['reason'])); }
    public function reconcile(Request $request, WithdrawalReconciliationService $service): JsonResponse { $actor = $this->actor($request); if (! in_array($actor->globalRole, ['ADMIN', 'SUPERADMIN'], true)) throw ApiProblem::forbidden(); $data = $request->validate(['provider' => ['required', 'string', 'max:40']]); return response()->json($service->run($data['provider'])); }
}
