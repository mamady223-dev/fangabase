<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

use FangaBase\Domain\Administration\AuditRecorder;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Policies\OrganizationPolicy;
use FangaBase\Support\ApiProblem;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OrganizationService
{
    public function __construct(
        private readonly OrganizationAccess $access,
        private readonly OrganizationPolicy $policy,
        private readonly AuditRecorder $audit,
    ) {}

    /** @return array{id: string, name: string, slug: string, status: string, role: string} */
    public function create(AuthenticatedActor $actor, string $name, string $slug): array
    {
        if (! $this->policy->create($actor)) {
            throw ApiProblem::forbidden();
        }
        $id = (string) Str::uuid();
        $now = now();

        try {
            DB::transaction(function () use ($id, $actor, $name, $slug, $now): void {
                DB::table('organizations')->insert([
                    'id' => $id,
                    'name' => $name,
                    'slug' => strtolower($slug),
                    'status' => 'ACTIVE',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('organization_members')->insert([
                    'organization_id' => $id,
                    'user_id' => $actor->id,
                    'role' => OrganizationRoles::OWNER,
                    'status' => 'ACTIVE',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $this->audit->record($actor->id, $id, 'ORGANIZATION_CREATED', 'organization', $id);
            });
        } catch (QueryException) {
            throw ApiProblem::conflict('ORGANIZATION_CONFLICT');
        }

        return ['id' => $id, 'name' => $name, 'slug' => strtolower($slug), 'status' => 'ACTIVE', 'role' => OrganizationRoles::OWNER];
    }

    /** @return list<object> */
    public function list(AuthenticatedActor $actor): array
    {
        return DB::table('organizations')
            ->join('organization_members', 'organization_members.organization_id', '=', 'organizations.id')
            ->where('organization_members.user_id', $actor->id)
            ->where('organization_members.status', 'ACTIVE')
            ->select('organizations.id', 'organizations.name', 'organizations.slug', 'organizations.status', 'organization_members.role')
            ->orderBy('organizations.name')
            ->get()->all();
    }

    /** @return array{id: string, name: string, slug: string, status: string, role: string} */
    public function get(AuthenticatedActor $actor, string $organizationId): array
    {
        $organization = $this->access->scoped($organizationId, $actor->id);
        if (! $this->policy->view($organization)) {
            throw ApiProblem::notFound();
        }

        return $this->present($organization);
    }

    /** @return array{id: string, name: string, slug: string, status: string, role: string} */
    public function update(AuthenticatedActor $actor, string $organizationId, string $name): array
    {
        return DB::transaction(function () use ($actor, $organizationId, $name): array {
            $organization = $this->access->scoped($organizationId, $actor->id);
            DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->first();
            if (! $this->policy->update($organization)) {
                throw ApiProblem::forbidden();
            }
            DB::table('organizations')->where('id', $organizationId)->update(['name' => $name, 'updated_at' => now()]);
            $this->audit->record($actor->id, $organizationId, 'ORGANIZATION_UPDATED', 'organization', $organizationId);

            return $this->present($this->access->scoped($organizationId, $actor->id));
        });
    }

    /** @return array{id: string, name: string, slug: string, status: string, role: string} */
    private function present(object $organization): array
    {
        return [
            'id' => (string) $organization->id,
            'name' => (string) $organization->name,
            'slug' => (string) $organization->slug,
            'status' => (string) $organization->status,
            'role' => (string) $organization->membership_role,
        ];
    }
}
