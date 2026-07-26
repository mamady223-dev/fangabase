<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Billing\BillingScopeResolver;
use FangaBase\Domain\Payments\CheckoutService;
use FangaBase\Domain\Payments\PaymentWebhookProcessor;
use FangaBase\Domain\Payments\PaymentReconciliationService;
use FangaBase\Domain\Payments\RefundService;
use FangaBase\Domain\Payments\WebhookVerifier;
use FangaBase\Domain\Payments\VerifiedPaymentEvent;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class PaymentController
{
    use ResolvesActor;

    public function checkout(Request $request, BillingScopeResolver $scopes, CheckoutService $service): JsonResponse
    {
        $data = $request->validate(['price_id' => ['required', 'uuid'], 'provider' => ['required', 'string', 'max:40'],
            'purpose' => ['required', 'in:CREDITS,SUBSCRIPTION,ONE_TIME,MARKETPLACE_COMMISSION'], 'return_path' => ['required', 'string', 'max:255'],
            'organization_id' => ['nullable', 'uuid']]);
        try {
            $result = $service->create($scopes->forActor($this->actor($request), $data['organization_id'] ?? null), $data['price_id'],
                $data['provider'], $data['purpose'], $data['return_path'], (string) $request->header('Idempotency-Key'));
        } catch (\RuntimeException $error) {
            $status = match ($error->getMessage()) {
                'PAYMENT_PROVIDER_NOT_CONFIGURED', 'PAYMENT_PROVIDER_TEMPORARY' => 503,
                'PAYMENT_PROVIDER_TIMEOUT' => 504,
                'PAYMENT_PROVIDER_CURRENCY_UNSUPPORTED' => 422,
                'PAYMENT_PROVIDER_REJECTED', 'PAYMENT_PROVIDER_INVALID_RESPONSE' => 502,
                default => null,
            };
            if ($status !== null) {
                throw new ApiProblem($error->getMessage(), $status);
            }
            throw $error;
        }

        return response()->json($result, 201);
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

    public function localWebhook(Request $request, PaymentWebhookProcessor $processor): JsonResponse
    {
        abort_unless(app()->environment('testing'), 404);
        $data = $request->validate([
            'event_id' => ['required', 'string', 'max:120'],
            'order_id' => ['required', 'uuid'],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
        ]);
        $event = new VerifiedPaymentEvent(
            'local',
            $data['event_id'],
            'payment.completed',
            $data['order_id'],
            'local:'.$data['order_id'],
            'SUCCEEDED',
            (int) $data['amount_minor'],
            strtoupper($data['currency']),
            1,
        );

        return response()->json(['status' => $processor->process($event)]);
    }

    public function orangeMoneyMlWebhook(Request $request, PaymentReconciliationService $reconciliation): JsonResponse
    {
        $raw = $request->getContent();
        if (strlen($raw) > 65536) {
            return response()->json(['error' => ['code' => 'WEBHOOK_INVALID']], 413);
        }
        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            return response()->json(['error' => ['code' => 'WEBHOOK_INVALID']], 400);
        }
        $references = array_values(array_filter([
            $payload['reference'] ?? null,
            $payload['order_id'] ?? $payload['orderId'] ?? null,
        ], fn (mixed $value): bool => is_string($value) && $value !== ''));
        if ($references === []) {
            return response()->json(['status' => 'accepted'], 202);
        }
        $attempt = DB::table('payment_attempts')
            ->where('provider', 'orange_money_ml')
            ->where(function ($query) use ($references): void {
                foreach ($references as $reference) {
                    $query->orWhere('provider_reference', $reference)->orWhere('order_id', $reference);
                }
            })
            ->first();
        if ($attempt === null) {
            return response()->json(['status' => 'accepted'], 202);
        }

        return response()->json(['status' => $reconciliation->reconcile((string) $attempt->order_id)], 202);
    }

    public function orangeMoneyMlReturn(Request $request, PaymentReconciliationService $reconciliation): JsonResponse
    {
        $token = (string) $request->query('token', '');
        if ($token === '') {
            return response()->json(['status' => 'verification_required'], 202);
        }
        $hash = hash('sha256', $token);
        $attempt = DB::table('payment_attempts')->where('provider', 'orange_money_ml')->get()
            ->first(function (object $candidate) use ($hash): bool {
                $metadata = json_decode((string) $candidate->safe_metadata, true);
                return is_array($metadata) && hash_equals((string) ($metadata['public_token_hash'] ?? ''), $hash);
            });
        if ($attempt === null) {
            return response()->json(['error' => ['code' => 'NOT_FOUND']], 404);
        }

        return response()->json([
            'status' => $reconciliation->reconcile((string) $attempt->order_id),
            'public_token' => $token,
        ], 202);
    }

    public function orangeMoneyMlCancel(Request $request, PaymentReconciliationService $reconciliation): JsonResponse
    {
        return $this->orangeMoneyMlReturn($request, $reconciliation);
    }
}
