<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Billing\BillingScopeResolver;
use FangaBase\Domain\Billing\CreditService;
use FangaBase\Domain\Billing\EntitlementService;
use FangaBase\Domain\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BillingController
{
    use ResolvesActor;
    public function summary(Request $request, BillingScopeResolver $scopes, CreditService $credits, SubscriptionService $subscriptions, EntitlementService $entitlements): JsonResponse { $input = $this->query($request); $scope = $scopes->forActor($this->actor($request), $input['organization_id'] ?? null); return response()->json(['credits' => $credits->summary($scope, (int) ($input['page'] ?? 1), (int) ($input['per_page'] ?? 25)), 'subscription' => $subscriptions->current($scope), 'entitlements' => $entitlements->resolve($scope)]); }
    public function credits(Request $request, BillingScopeResolver $scopes, CreditService $credits): JsonResponse { $input = $this->query($request); return response()->json($credits->summary($scopes->forActor($this->actor($request), $input['organization_id'] ?? null), (int) ($input['page'] ?? 1), (int) ($input['per_page'] ?? 25))); }
    public function subscription(Request $request, BillingScopeResolver $scopes, SubscriptionService $subscriptions): JsonResponse { $input = $this->query($request); return response()->json(['data' => $subscriptions->current($scopes->forActor($this->actor($request), $input['organization_id'] ?? null))]); }
    public function entitlements(Request $request, BillingScopeResolver $scopes, EntitlementService $service): JsonResponse { $input = $this->query($request); return response()->json($service->resolve($scopes->forActor($this->actor($request), $input['organization_id'] ?? null))); }
    public function purchaseCredits(Request $request, BillingScopeResolver $scopes, CreditService $credits): JsonResponse { $data = $request->validate(['price_id' => ['required', 'uuid'], 'organization_id' => ['nullable', 'uuid']]); return response()->json($credits->purchase($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $data['price_id'], (string) $request->header('Idempotency-Key')), 201); }
    public function createSubscription(Request $request, BillingScopeResolver $scopes, SubscriptionService $subscriptions): JsonResponse { $data = $request->validate(['plan_id' => ['required', 'uuid'], 'price_id' => ['required', 'uuid'], 'organization_id' => ['nullable', 'uuid']]); return response()->json($subscriptions->createPending($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $data['plan_id'], $data['price_id']), 201); }
    public function cancel(Request $request, string $subscription, BillingScopeResolver $scopes, SubscriptionService $subscriptions): JsonResponse { $data = $request->validate(['immediate' => ['required', 'boolean'], 'organization_id' => ['nullable', 'uuid']]); return response()->json($subscriptions->scheduleCancellation($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $subscription, $data['immediate'])); }
    private function query(Request $request): array { return $request->validate(['organization_id' => ['nullable', 'uuid'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]); }
}
