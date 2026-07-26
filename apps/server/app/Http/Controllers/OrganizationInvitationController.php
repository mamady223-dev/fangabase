<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Organizations\OrganizationInvitationService;
use FangaBase\Domain\Organizations\LocalOrganizationInvitationProvider;
use FangaBase\Http\Requests\InviteOrganizationMemberRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrganizationInvitationController
{
    use ResolvesActor;

    public function store(InviteOrganizationMemberRequest $request, string $organization, OrganizationInvitationService $invitations, LocalOrganizationInvitationProvider $local): JsonResponse
    {
        $input = $request->validated();
        $invitations->invite($this->actor($request), $organization, $input['email'], $input['role']);

        $response = ['message' => 'Invitation enregistree'];
        if (app()->environment('testing') && $request->header('X-FangaBase-Conformance') === '1') {
            $response['token'] = $local->token($organization, $input['email']);
        }

        return response()->json($response, 202);
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
