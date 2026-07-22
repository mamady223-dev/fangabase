<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class MoneroPaymentService
{
    public function __construct(private MoneroWallet $wallet) {}

    public function create(string $orderId, int $amountAtomic, int $rateNumerator, int $rateDenominator, int $ttlMinutes): array
    {
        if ($amountAtomic <= 0 || $rateNumerator <= 0 || $rateDenominator <= 0 || $ttlMinutes < 1) throw ApiProblem::validation();
        $id = (string) Str::uuid();
        $paymentId = bin2hex(random_bytes(8));
        $address = $this->wallet->createIntegratedAddress($paymentId);
        DB::table('monero_payment_requests')->insert(['id' => $id, 'order_id' => $orderId, 'payment_id_hash' => hash('sha256', $paymentId),
            'payment_id_encrypted' => encrypt($paymentId), 'address' => $address, 'expected_atomic' => $amountAtomic, 'rate_numerator' => $rateNumerator,
            'rate_denominator' => $rateDenominator, 'minimum_confirmations' => (int) config('fangabase.payments.monero.minimum_confirmations', 10),
            'status' => 'PENDING', 'expires_at' => now()->addMinutes($ttlMinutes), 'created_at' => now(), 'updated_at' => now()]);
        return ['id' => $id, 'address' => $address, 'amount_atomic' => $amountAtomic, 'expires_at' => now()->addMinutes($ttlMinutes)->toISOString()];
    }

    public function reconcile(string $id): string
    {
        return DB::transaction(function () use ($id): string {
            $request = DB::table('monero_payment_requests')->where('id', $id)->lockForUpdate()->first();
            if ($request === null) throw ApiProblem::notFound();
            if (in_array($request->status, ['CONFIRMED', 'LATE', 'OVERPAID'], true)) return $request->status;
            $payments = $this->wallet->payments(decrypt($request->payment_id_encrypted));
            $confirmed = 0; $all = 0;
            foreach ($payments as $payment) {
                $all += $payment['amount_atomic'];
                if ($payment['confirmations'] >= (int) $request->minimum_confirmations) $confirmed += $payment['amount_atomic'];
            }
            $status = $all === 0 ? ($request->expires_at < now() ? 'EXPIRED' : 'PENDING')
                : ($confirmed < (int) $request->expected_atomic ? ($request->expires_at < now() ? 'LATE' : 'UNDERPAID')
                    : ($confirmed > (int) $request->expected_atomic ? 'OVERPAID' : 'CONFIRMED'));
            DB::table('monero_payment_requests')->where('id', $id)->update(['received_atomic' => $all, 'confirmed_atomic' => $confirmed, 'status' => $status, 'updated_at' => now()]);
            return $status;
        });
    }
}
