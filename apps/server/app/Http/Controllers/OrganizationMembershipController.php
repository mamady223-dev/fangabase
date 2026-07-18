<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Organizations\MembershipService;
use FangaBase\Http\Requests\UpdateMembershipRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrganizationMembershipController
{
    use ResolvesActor;

    public function index(Request $request, string $organization, MembershipService $memberships): JsonResponse
    {
        return response()->json(['members' => $memberships->list($this->actor($request), $organization)]);
    }

    public function update(UpdateMembershipRequest $request, string $organization, string $user, MembershipService $memberships): JsonResponse
    {
        $input = $request->validated();
        $memberships->change($this->actor($request), $organization, $user, $input['role'] ?? null, $input['status'] ?? null);

        return response()->json(['message' => 'Adhesion modifiee']);
    }

    public function destroy(Request $request, string $organization, string $user, MembershipService $memberships): JsonResponse
    {
        $memberships->remove($this->actor($request), $organization, $user);

        return response()->json(['message' => 'Adhesion retiree']);
    }

    public function leave(Request $request, string $organization, MembershipService $memberships): JsonResponse
    {
        $memberships->leave($this->actor($request), $organization);

        return response()->json(['message' => 'Organisation quittee']);
    }
}
