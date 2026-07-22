<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Payments;

use FangaBase\Domain\Payments\MoneroWallet;
use Illuminate\Support\Facades\Http;

final readonly class MoneroWalletRpc implements MoneroWallet
{
    public function __construct(private string $url, private ?string $username, private ?string $password) {}

    public function createIntegratedAddress(string $paymentId): string
    {
        $result = $this->call('make_integrated_address', ['payment_id' => $paymentId]);
        $address = $result['integrated_address'] ?? null;
        if (! is_string($address) || $address === '') throw new \RuntimeException('MONERO_WALLET_INVALID_RESPONSE');
        return $address;
    }

    public function payments(string $paymentId): array
    {
        $result = $this->call('get_payments', ['payment_id' => $paymentId]);
        $payments = [];
        foreach (($result['payments'] ?? []) as $payment) {
            if (! is_array($payment) || ! isset($payment['amount'], $payment['tx_hash'])) continue;
            $payments[] = ['amount_atomic' => (int) $payment['amount'], 'confirmations' => (int) ($payment['confirmations'] ?? 0), 'tx_hash' => (string) $payment['tx_hash']];
        }
        return $payments;
    }

    private function call(string $method, array $params): array
    {
        $request = Http::timeout(15);
        if ($this->username !== null && $this->username !== '') $request = $request->withBasicAuth($this->username, (string) $this->password);
        $response = $request->post($this->url, ['jsonrpc' => '2.0', 'id' => 'fangabase', 'method' => $method, 'params' => $params]);
        $json = $response->json();
        if (! $response->successful() || ! is_array($json) || isset($json['error']) || ! is_array($json['result'] ?? null)) throw new \RuntimeException('MONERO_WALLET_UNAVAILABLE');
        return $json['result'];
    }
}
