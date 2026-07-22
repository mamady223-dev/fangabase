<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Billing\BillingScopeResolver;
use FangaBase\Domain\Withdrawals\PayoutAccountService;
use FangaBase\Domain\Withdrawals\PayoutCallbackProcessor;
use FangaBase\Domain\Withdrawals\PayoutCallbackVerifier;
use FangaBase\Domain\Withdrawals\WithdrawalLedger;
use FangaBase\Domain\Withdrawals\WithdrawalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WithdrawalController
{
    use ResolvesActor;
    public function index(Request $request, BillingScopeResolver $scopes, WithdrawalService $service): JsonResponse { $data = $request->validate(['organization_id' => ['nullable', 'uuid'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]); return response()->json($service->list($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), (int) ($data['page'] ?? 1), (int) ($data['per_page'] ?? 25))); }
    public function balance(Request $request, BillingScopeResolver $scopes, WithdrawalLedger $ledger): JsonResponse { $data = $request->validate(['organization_id' => ['nullable', 'uuid'], 'currency' => ['required', 'string', 'size:3']]); return response()->json($ledger->summary($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), strtoupper($data['currency']))); }
    public function account(Request $request, BillingScopeResolver $scopes, PayoutAccountService $service): JsonResponse { $data = $request->validate(['organization_id' => ['nullable', 'uuid'], 'provider' => ['required', 'string', 'max:40'], 'country' => ['required', 'string', 'size:2'], 'currency' => ['required', 'string', 'size:3'], 'destination' => ['required', 'array', 'min:1', 'max:10']]); return response()->json($service->create($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $data['provider'], $data['country'], $data['currency'], $data['destination']), 201); }
    public function request(Request $request, BillingScopeResolver $scopes, WithdrawalService $service): JsonResponse { $data = $request->validate(['organization_id' => ['nullable', 'uuid'], 'payout_account_id' => ['required', 'uuid'], 'amount_minor' => ['required', 'integer', 'min:1'], 'currency' => ['required', 'string', 'size:3']]); return response()->json($service->request($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $data['payout_account_id'], (int) $data['amount_minor'], $data['currency'], (string) $request->header('Idempotency-Key')), 201); }
    public function cancel(Request $request, string $withdrawal, BillingScopeResolver $scopes, WithdrawalService $service): JsonResponse { $data = $request->validate(['organization_id' => ['nullable', 'uuid']]); return response()->json($service->cancel($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $withdrawal)); }
    public function callback(Request $request, string $provider, PayoutCallbackVerifier $verifier, PayoutCallbackProcessor $processor): JsonResponse { return response()->json(['status' => $processor->process($verifier->verify($provider, $request->getContent(), $request->headers->all(), time()))]); }
}
