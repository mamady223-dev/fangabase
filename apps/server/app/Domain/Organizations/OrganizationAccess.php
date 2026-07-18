<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final class OrganizationAccess
{
    public function scoped(string $organizationId, string $userId): object
    {
        $organization = DB::table('organizations')
            ->join('organization_members', 'organization_members.organization_id', '=', 'organizations.id')
            ->where('organizations.id', $organizationId)
            ->where('organization_members.user_id', $userId)
            ->where('organization_members.status', 'ACTIVE')
            ->select('organizations.*', 'organization_members.role as membership_role', 'organization_members.status as membership_status')
            ->first();

        if ($organization === null) {
            throw ApiProblem::notFound();
        }

        return $organization;
    }
}
