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
        $existing = DB::table('idempotency_keys')->where(['owner_id' => $owner->id, 'operation' => $operation, 'provider' => $provider, 'idempotency_key' => $key])->lockForUpdate()->first();
        if ($existing !== null) {
            if (! hash_equals((string) $existing->body_hash, $hash)) throw ApiProblem::conflict('IDEMPOTENCY_BODY_MISMATCH');
            return json_decode((string) $existing->result, true, flags: JSON_THROW_ON_ERROR);
        }
        $result = $action();
        DB::table('idempotency_keys')->insert(['id' => (string) Str::uuid(), 'owner_id' => $owner->id, 'operation' => $operation, 'provider' => $provider, 'idempotency_key' => $key, 'body_hash' => $hash, 'result' => json_encode($result, JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
        return $result;
    }
    private function canonical(array $value): string { ksort($value); return json_encode($value, JSON_THROW_ON_ERROR); }
}
