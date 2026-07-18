<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OrganizationInvitationMailer
{
    public function enqueue(string $invitationId, string $email, string $token): void
    {
        $jobId = (string) Str::uuid();
        $now = now();
        DB::table('email_jobs')->insert([
            'id' => $jobId,
            'idempotency_key' => 'organization-invitation:'.$invitationId,
            'type' => 'ORGANIZATION_INVITATION',
            'payload' => json_encode([
                'invitation_id' => $invitationId,
                'recipient' => strtolower($email),
                'token_encrypted' => Crypt::encryptString($token),
                'provider' => config('fangabase.mail_provider', 'local'),
            ], JSON_THROW_ON_ERROR),
            'status' => 'PENDING',
            'attempts' => 0,
            'available_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
