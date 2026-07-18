<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Policies\OrganizationPolicy;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OrganizationInvitationService
{
    public function __construct(
        private readonly OrganizationAccess $access,
        private readonly OrganizationPolicy $policy,
        private readonly OrganizationInvitationMailer $mailer,
        private readonly AuditRecorder $audit,
    ) {}

    public function invite(AuthenticatedActor $actor, string $organizationId, string $email, string $role): void
    {
        $organization = $this->access->scoped($organizationId, $actor->id);
        if (! in_array($role, [OrganizationRoles::ADMIN, OrganizationRoles::MEMBER], true)
            || ! $this->policy->manageRole($organization, $role)) {
            throw ApiProblem::forbidden();
        }
        $normalizedEmail = strtolower(trim($email));
        $token = bin2hex(random_bytes(32));
        $invitationId = (string) Str::uuid();
        $now = now();

        DB::transaction(function () use ($actor, $organizationId, $normalizedEmail, $role, $token, $invitationId, $now): void {
            DB::table('organization_invitations')
                ->where('organization_id', $organizationId)
                ->where('email', $normalizedEmail)
                ->where('status', 'PENDING')
                ->lockForUpdate()
                ->update(['status' => 'REPLACED', 'responded_at' => $now, 'updated_at' => $now]);
            DB::table('organization_invitations')->insert([
                'id' => $invitationId,
                'organization_id' => $organizationId,
                'invited_by' => $actor->id,
                'email' => $normalizedEmail,
                'role' => $role,
                'token_hash' => hash('sha256', $token),
                'status' => 'PENDING',
                'expires_at' => $now->copy()->addHours(24),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->mailer->enqueue($invitationId, $normalizedEmail, $token);
            $this->audit->record($actor->id, $organizationId, 'ORGANIZATION_INVITATION_CREATED', 'organization_invitation', $invitationId, null, ['role' => $role]);
        });
    }

    public function respond(AuthenticatedActor $actor, string $organizationId, string $token, bool $accept): void
    {
        DB::transaction(function () use ($actor, $organizationId, $token, $accept): void {
            $invitation = DB::table('organization_invitations')
                ->where('organization_id', $organizationId)
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()->first();
            if ($invitation === null
                || $invitation->status !== 'PENDING'
                || now()->greaterThanOrEqualTo($invitation->expires_at)
                || ! hash_equals((string) $invitation->email, strtolower($actor->email))) {
                throw ApiProblem::notFound();
            }
            $organization = DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->first();
            if ($organization === null || $organization->status !== 'ACTIVE'
                || ! in_array($invitation->role, [OrganizationRoles::ADMIN, OrganizationRoles::MEMBER], true)) {
                throw ApiProblem::notFound();
            }

            $status = $accept ? 'ACCEPTED' : 'DECLINED';
            $updated = DB::table('organization_invitations')->where('id', $invitation->id)->where('status', 'PENDING')->update([
                'status' => $status,
                'responded_at' => now(),
                'updated_at' => now(),
            ]);
            if ($updated !== 1) {
                throw ApiProblem::notFound();
            }
            if ($accept) {
                DB::table('organization_members')->updateOrInsert(
                    ['organization_id' => $organizationId, 'user_id' => $actor->id],
                    ['role' => $invitation->role, 'status' => 'ACTIVE', 'suspended_at' => null, 'created_at' => now(), 'updated_at' => now()],
                );
            }
            $this->audit->record($actor->id, $organizationId, 'ORGANIZATION_INVITATION_'.$status, 'organization_invitation', (string) $invitation->id);
        });
    }
}
