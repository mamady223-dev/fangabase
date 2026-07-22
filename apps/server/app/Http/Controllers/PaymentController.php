<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Billing\BillingScopeResolver;
use FangaBase\Domain\Payments\CheckoutService;
use FangaBase\Domain\Payments\PaymentWebhookProcessor;
use FangaBase\Domain\Payments\RefundService;
use FangaBase\Domain\Payments\WebhookVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PaymentController
{
    use ResolvesActor;

    public function checkout(Request $request, BillingScopeResolver $scopes, CheckoutService $service): JsonResponse
    {
        $data = $request->validate(['price_id' => ['required', 'uuid'], 'provider' => ['required', 'string', 'max:40'],
            'purpose' => ['required', 'in:CREDITS,SUBSCRIPTION,ONE_TIME,MARKETPLACE_COMMISSION'], 'return_path' => ['required', 'string', 'max:255'],
            'organization_id' => ['nullable', 'uuid']]);
        return response()->json($service->create($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $data['price_id'],
            $data['provider'], $data['purpose'], $data['return_path'], (string) $request->header('Idempotency-Key')), 201);
    }

    public function refund(Request $request, string $order, BillingScopeResolver $scopes, RefundService $service): JsonResponse
    {
        $data = $request->validate(['amount_minor' => ['required', 'integer', 'min:1'], 'reason' => ['required', 'string', 'max:500'], 'organization_id' => ['nullable', 'uuid']]);
        return response()->json($service->request($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $order,
            (int) $data['amount_minor'], $data['reason'], (string) $request->header('Idempotency-Key')), 202);
    }

    public function stripeWebhook(Request $request, WebhookVerifier $verifier, PaymentWebhookProcessor $processor): JsonResponse
    {
        $raw = $request->getContent();
        $event = $verifier->verify($raw, $request->headers->all(), time());
        return response()->json(['status' => $processor->process($event)]);
    }
}
