<?php

declare(strict_types=1);

namespace FangaBase\Domain\Administration;

use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Policies\PlatformAdminPolicy;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final class PlatformAdministrationService
{
    public function __construct(
        private readonly PlatformAdminPolicy $policy,
        private readonly AuditRecorder $audit,
    ) {}

    /** @return array{data: list<object>, page: int, per_page: int, total: int} */
    public function users(AuthenticatedActor $actor, int $page, int $perPage): array
    {
        $this->assertView($actor);
        $query = DB::table('users')->select('id', 'email', 'role', 'status', 'email_verified_at')->orderBy('email');
        $total = $query->count();

        return ['data' => $query->forPage($page, $perPage)->get()->all(), 'page' => $page, 'per_page' => $perPage, 'total' => $total];
    }

    /** @return array{data: list<object>, page: int, per_page: int, total: int} */
    public function organizations(AuthenticatedActor $actor, int $page, int $perPage): array
    {
        $this->assertView($actor);
        $query = DB::table('organizations')->select('id', 'name', 'slug', 'status', 'suspended_at')->orderBy('name');
        $total = $query->count();

        return ['data' => $query->forPage($page, $perPage)->get()->all(), 'page' => $page, 'per_page' => $perPage, 'total' => $total];
    }

    public function updateUser(AuthenticatedActor $actor, string $userId, ?string $role, ?string $status, string $reason): void
    {
        if (! $this->policy->mutate($actor)) {
            throw ApiProblem::forbidden();
        }
        DB::transaction(function () use ($actor, $userId, $role, $status, $reason): void {
            $target = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            if ($target === null) {
                throw ApiProblem::notFound();
            }
            if ($role !== null && ! in_array($role, ['USER', 'ADMIN', 'SUPERADMIN'], true)) {
                throw ApiProblem::validation();
            }
            if ($status !== null && ! in_array($status, ['ACTIVE', 'SUSPENDED'], true)) {
                throw ApiProblem::validation();
            }
            $removesActiveSuperadmin = $target->role === 'SUPERADMIN'
                && $target->status === 'ACTIVE'
                && (($role !== null && $role !== 'SUPERADMIN') || ($status !== null && $status !== 'ACTIVE'));
            if ($removesActiveSuperadmin) {
                $activeSuperadmins = DB::table('users')
                    ->where('role', 'SUPERADMIN')->where('status', 'ACTIVE')->lockForUpdate()->get();
                if ($activeSuperadmins->count() <= 1) {
                    throw ApiProblem::conflict('LAST_SUPERADMIN');
                }
            }

            $changes = ['updated_at' => now()];
            if ($role !== null) {
                $changes['role'] = $role;
            }
            if ($status !== null) {
                $changes['status'] = $status;
            }
            if ($status === 'SUSPENDED') {
                $changes['session_version'] = (int) $target->session_version + 1;
                DB::table('refresh_sessions')->where('user_id', $userId)->whereNull('revoked_at')->update([
                    'revoked_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            DB::table('users')->where('id', $userId)->update($changes);
            $this->audit->record($actor->id, null, 'PLATFORM_USER_UPDATED', 'user', $userId, $reason, [
                'role' => $role,
                'status' => $status,
            ]);
        });
    }

    public function updateOrganization(AuthenticatedActor $actor, string $organizationId, string $status, string $reason): void
    {
        if (! $this->policy->mutate($actor)) {
            throw ApiProblem::forbidden();
        }
        DB::transaction(function () use ($actor, $organizationId, $status, $reason): void {
            $organization = DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->first();
            if ($organization === null) {
                throw ApiProblem::notFound();
            }
            DB::table('organizations')->where('id', $organizationId)->update([
                'status' => $status,
                'suspended_at' => $status === 'SUSPENDED' ? now() : null,
                'updated_at' => now(),
            ]);
            $this->audit->record($actor->id, $organizationId, 'PLATFORM_ORGANIZATION_'.$status, 'organization', $organizationId, $reason);
        });
    }

    private function assertView(AuthenticatedActor $actor): void
    {
        if (! $this->policy->view($actor)) {
            throw ApiProblem::forbidden();
        }
    }
}
