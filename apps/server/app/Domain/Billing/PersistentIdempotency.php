<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PersistentIdempotency
{
    public function execute(BillingScope $owner, string $operation, string $provider, string $key, array $body, callable $action): mixed
    {
        if (strlen($key) < 16 || strlen($key) > 128) throw ApiProblem::validation();
        $hash = hash('sha256', $this->canonical($body));
        $identity = ['owner_id' => $owner->id, 'operation' => $operation, 'provider' => $provider, 'idempotency_key' => $key];
        $inserted = DB::table('idempotency_keys')->insertOrIgnore(['id' => (string) Str::uuid(), ...$identity, 'body_hash' => $hash,
            'result' => json_encode(['__pending' => true], JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
        if ($inserted === 0) {
            $existing = DB::table('idempotency_keys')->where($identity)->lockForUpdate()->first();
            if ($existing === null) throw ApiProblem::conflict('IDEMPOTENCY_IN_PROGRESS');
            if (! hash_equals((string) $existing->body_hash, $hash)) throw ApiProblem::conflict('IDEMPOTENCY_BODY_MISMATCH');
            $result = json_decode((string) $existing->result, true, flags: JSON_THROW_ON_ERROR);
            if (is_array($result) && ($result['__pending'] ?? false) === true) throw ApiProblem::conflict('IDEMPOTENCY_IN_PROGRESS');
            if (is_array($result)) ksort($result);
            return $result;
        }
        $result = $action();
        if (is_array($result)) ksort($result);
        DB::table('idempotency_keys')->where($identity)->update(['result' => json_encode($result, JSON_THROW_ON_ERROR), 'updated_at' => now()]);
        return $result;
    }
    private function canonical(array $value): string { ksort($value); return json_encode($value, JSON_THROW_ON_ERROR); }
}
