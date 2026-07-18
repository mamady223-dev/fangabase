<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

final class BillingScopeResolver
{
    public function forActor(AuthenticatedActor $actor, ?string $organizationId): BillingScope
    {
        if ($organizationId === null) return new BillingScope('USER', $actor->id);
        $member = DB::table('organization_members')->join('organizations', 'organizations.id', '=', 'organization_members.organization_id')->where(['organization_members.organization_id' => $organizationId, 'organization_members.user_id' => $actor->id, 'organizations.status' => 'ACTIVE'])->exists();
        if (! $member) throw ApiProblem::notFound();
        return new BillingScope('ORGANIZATION', $organizationId);
    }
}
