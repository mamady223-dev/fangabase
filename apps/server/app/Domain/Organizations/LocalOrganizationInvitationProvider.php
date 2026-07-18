<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

final class LocalOrganizationInvitationProvider
{
    public function token(string $organizationId, string $email): string
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('LOCAL_INVITATION_PROVIDER_DISABLED');
        }
        $activeHashes = DB::table('organization_invitations')
            ->where('organization_id', $organizationId)
            ->where('email', strtolower($email))
            ->where('status', 'PENDING')
            ->pluck('token_hash')->all();
        foreach (DB::table('email_jobs')->where('type', 'ORGANIZATION_INVITATION')->get() as $job) {
            $payload = json_decode((string) $job->payload, true, flags: JSON_THROW_ON_ERROR);
            if (($payload['recipient'] ?? null) === strtolower($email)) {
                $token = Crypt::decryptString((string) $payload['token_encrypted']);
                if (in_array(hash('sha256', $token), $activeHashes, true)) {
                    return $token;
                }
            }
        }

        throw new \RuntimeException('LOCAL_INVITATION_NOT_FOUND');
    }
}
