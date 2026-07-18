<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Policies\OrganizationPolicy;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final class MembershipService
{
    public function __construct(
        private readonly OrganizationAccess $access,
        private readonly OrganizationPolicy $policy,
        private readonly AuditRecorder $audit,
    ) {}

    /** @return list<object> */
    public function list(AuthenticatedActor $actor, string $organizationId): array
    {
        $organization = $this->access->scoped($organizationId, $actor->id);
        if (! $this->policy->view($organization)) {
            throw ApiProblem::notFound();
        }

        return DB::table('organization_members')
            ->join('users', 'users.id', '=', 'organization_members.user_id')
            ->where('organization_members.organization_id', $organizationId)
            ->select('users.id', 'users.email', 'organization_members.role', 'organization_members.status')
            ->orderBy('users.email')->get()->all();
    }

    public function change(AuthenticatedActor $actor, string $organizationId, string $targetUserId, ?string $role, ?string $status): void
    {
        DB::transaction(function () use ($actor, $organizationId, $targetUserId, $role, $status): void {
            $organization = $this->access->scoped($organizationId, $actor->id);
            $target = DB::table('organization_members')
                ->where('organization_id', $organizationId)
                ->where('user_id', $targetUserId)
                ->lockForUpdate()->first();
            if ($target === null || ! $this->policy->manageMember($organization, (string) $target->role)) {
                throw ApiProblem::notFound();
            }
            if ($actor->id === $targetUserId && $role !== null) {
                throw ApiProblem::forbidden();
            }
            if ($role !== null && (! in_array($role, OrganizationRoles::ALL, true)
                || ! $this->policy->manageRole($organization, $role))) {
                throw ApiProblem::forbidden();
            }
            if ($role === OrganizationRoles::OWNER && $organization->membership_role !== OrganizationRoles::OWNER) {
                throw ApiProblem::forbidden();
            }
            if (($status !== null && $status !== 'ACTIVE') || ($role !== null && $target->role === OrganizationRoles::OWNER && $role !== OrganizationRoles::OWNER)) {
                $this->assertAnotherOwner($organizationId, $targetUserId);
            }

            $changes = ['updated_at' => now()];
            if ($role !== null) {
                $changes['role'] = $role;
            }
            if ($status !== null) {
                $changes['status'] = $status;
                $changes['suspended_at'] = $status === 'SUSPENDED' ? now() : null;
            }
            DB::table('organization_members')
                ->where('organization_id', $organizationId)
                ->where('user_id', $targetUserId)
                ->update($changes);
            $this->audit->record($actor->id, $organizationId, 'ORGANIZATION_MEMBERSHIP_CHANGED', 'user', $targetUserId, null, [
                'role' => $role,
                'status' => $status,
            ]);
        });
    }

    public function remove(AuthenticatedActor $actor, string $organizationId, string $targetUserId): void
    {
        $this->change($actor, $organizationId, $targetUserId, null, 'REMOVED');
    }

    public function leave(AuthenticatedActor $actor, string $organizationId): void
    {
        DB::transaction(function () use ($actor, $organizationId): void {
            $organization = $this->access->scoped($organizationId, $actor->id);
            DB::table('organization_members')->where('organization_id', $organizationId)->where('user_id', $actor->id)->lockForUpdate()->first();
            if ($organization->membership_role === OrganizationRoles::OWNER) {
                $this->assertAnotherOwner($organizationId, $actor->id);
            }
            DB::table('organization_members')->where('organization_id', $organizationId)->where('user_id', $actor->id)->update([
                'status' => 'REMOVED',
                'updated_at' => now(),
            ]);
            $this->audit->record($actor->id, $organizationId, 'ORGANIZATION_LEFT', 'user', $actor->id);
        });
    }

    private function assertAnotherOwner(string $organizationId, string $excludedUserId): void
    {
        $owners = DB::table('organization_members')
            ->where('organization_id', $organizationId)
            ->where('role', OrganizationRoles::OWNER)
            ->where('status', 'ACTIVE')
            ->lockForUpdate()->get();
        if ($owners->where('user_id', '!=', $excludedUserId)->isEmpty()) {
            throw ApiProblem::conflict('LAST_ORGANIZATION_OWNER');
        }
    }
}
