<?php

declare(strict_types=1);

namespace FangaBase\Domain\Withdrawals;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Domain\Billing\BillingScope;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class PayoutAccountService
{
    public function __construct(private AuditRecorder $audit) {}
    public function create(BillingScope $owner, string $provider, string $country, string $currency, array $destination): array
    {
        $country = strtoupper($country); $currency = strtoupper($currency);
        if (preg_match('/^[A-Z]{2}$/', $country) !== 1 || preg_match('/^[A-Z]{3}$/', $currency) !== 1 || count($destination) === 0 || count($destination) > 10) throw ApiProblem::validation();
        foreach ($destination as $key => $value) if (! is_string($key) || ! is_string($value) || $value === '' || strlen($value) > 255) throw ApiProblem::validation();
        ksort($destination); $fingerprint = hash_hmac('sha256', json_encode($destination, JSON_THROW_ON_ERROR), (string) config('app.key'));
        $id = (string) Str::uuid(); DB::table('payout_accounts')->insert(['id' => $id, 'owner_id' => $owner->id, 'owner_type' => $owner->type, 'provider' => $provider,
            'country' => $country, 'currency' => $currency, 'encrypted_details' => encrypt(json_encode($destination, JSON_THROW_ON_ERROR)), 'destination_fingerprint' => $fingerprint,
            'status' => 'PENDING_VERIFICATION', 'created_at' => now(), 'updated_at' => now()]);
        return ['id' => $id, 'provider' => $provider, 'country' => $country, 'currency' => $currency, 'status' => 'PENDING_VERIFICATION'];
    }
    public function setStatus(AuthenticatedActor $actor, string $id, string $status, string $reason): array
    {
        if (! in_array($actor->globalRole, ['ADMIN', 'SUPERADMIN'], true)) throw ApiProblem::forbidden();
        if (! in_array($status, ['VERIFIED', 'SUSPENDED'], true) || trim($reason) === '') throw ApiProblem::validation();
        $account = DB::table('payout_accounts')->where('id', $id)->first(); if ($account === null) throw ApiProblem::notFound();
        DB::table('payout_accounts')->where('id', $id)->update(['status' => $status, 'verified_at' => $status === 'VERIFIED' ? now() : $account->verified_at, 'updated_at' => now()]);
        $this->audit->record($actor->id, $account->owner_type === 'ORGANIZATION' ? $account->owner_id : null, 'PAYOUT_ACCOUNT_'.$status, 'payout_account', $id, $reason, ['provider' => $account->provider]);
        return ['id' => $id, 'status' => $status];
    }
}
