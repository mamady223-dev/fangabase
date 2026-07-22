<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Withdrawals;

use FangaBase\Domain\Withdrawals\PayoutCallbackVerifier;
use FangaBase\Domain\Withdrawals\PayoutResult;
use FangaBase\Domain\Withdrawals\VerifiedPayoutCallback;
use FangaBase\Domain\Withdrawals\PayoutProviderRegistry;

final readonly class ConfiguredHmacPayoutCallbackVerifier implements PayoutCallbackVerifier
{
    public function __construct(private PayoutProviderRegistry $providers) {}
    public function verify(string $provider, string $rawBody, array $headers, int $now): VerifiedPayoutCallback
    {
        $this->providers->require($provider);
        $secret = (string) config('fangabase.withdrawals.callback_secrets.'.$provider, '');
        if ($secret === '' || strlen($rawBody) > 1048576) throw new \RuntimeException('PAYOUT_CALLBACK_REJECTED');
        $timestamp = (int) ($this->header($headers, 'x-fangabase-timestamp') ?? 0); $signature = (string) ($this->header($headers, 'x-fangabase-signature') ?? '');
        if ($timestamp <= 0 || abs($now - $timestamp) > 300 || ! hash_equals(hash_hmac('sha256', $timestamp.'.'.$rawBody, $secret), $signature)) throw new \RuntimeException('PAYOUT_CALLBACK_REJECTED');
        $data = json_decode($rawBody, true, flags: JSON_THROW_ON_ERROR);
        foreach (['event_id', 'event_type', 'withdrawal_id', 'reference', 'status'] as $key) if (! isset($data[$key]) || ! is_string($data[$key]) || $data[$key] === '') throw new \RuntimeException('PAYOUT_CALLBACK_REJECTED');
        if (! in_array($data['status'], ['PENDING', 'PAID', 'FAILED'], true)) throw new \RuntimeException('PAYOUT_CALLBACK_REJECTED');
        return new VerifiedPayoutCallback($provider, $data['event_id'], $data['event_type'], $data['withdrawal_id'], new PayoutResult($data['reference'], $data['status']), []);
    }
    private function header(array $headers, string $name): ?string { $value = $headers[$name] ?? null; return is_array($value) ? ($value[0] ?? null) : $value; }
}
