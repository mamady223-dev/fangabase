<?php

declare(strict_types=1);

namespace FangaBase\Policies;

use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Domain\Organizations\OrganizationRoles;

final class OrganizationPolicy
{
    public function create(AuthenticatedActor $actor): bool
    {
        return $actor->id !== '';
    }

    public function view(object $scopedOrganization): bool
    {
        return $scopedOrganization->membership_status === 'ACTIVE';
    }

    public function update(object $scopedOrganization): bool
    {
        return $scopedOrganization->status === 'ACTIVE'
            && in_array($scopedOrganization->membership_role, [OrganizationRoles::OWNER, OrganizationRoles::ADMIN], true);
    }

    public function manageRole(object $scopedOrganization, string $targetRole): bool
    {
        if ($scopedOrganization->status !== 'ACTIVE') {
            return false;
        }
        if ($scopedOrganization->membership_role === OrganizationRoles::OWNER) {
            return in_array($targetRole, OrganizationRoles::ALL, true);
        }

        return $scopedOrganization->membership_role === OrganizationRoles::ADMIN
            && $targetRole === OrganizationRoles::MEMBER;
    }

    public function manageMember(object $scopedOrganization, string $targetRole): bool
    {
        if ($scopedOrganization->status !== 'ACTIVE') {
            return false;
        }

        return $scopedOrganization->membership_role === OrganizationRoles::OWNER
            || ($scopedOrganization->membership_role === OrganizationRoles::ADMIN && $targetRole === OrganizationRoles::MEMBER);
    }
}
