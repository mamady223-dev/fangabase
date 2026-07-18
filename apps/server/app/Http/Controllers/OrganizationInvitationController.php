<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Organizations\OrganizationInvitationService;
use FangaBase\Http\Requests\InviteOrganizationMemberRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrganizationInvitationController
{
    use ResolvesActor;

    public function store(InviteOrganizationMemberRequest $request, string $organization, OrganizationInvitationService $invitations): JsonResponse
    {
        $input = $request->validated();
        $invitations->invite($this->actor($request), $organization, $input['email'], $input['role']);

        return response()->json(['message' => 'Invitation enregistree'], 202);
    }

    public function accept(Request $request, string $organization, string $token, OrganizationInvitationService $invitations): JsonResponse
    {
        $invitations->respond($this->actor($request), $organization, $token, true);

        return response()->json(['message' => 'Invitation acceptee']);
    }

    public function refuse(Request $request, string $organization, string $token, OrganizationInvitationService $invitations): JsonResponse
    {
        $invitations->respond($this->actor($request), $organization, $token, false);

        return response()->json(['message' => 'Invitation refusee']);
    }
}
