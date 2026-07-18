<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Administration\PlatformAdministrationService;
use FangaBase\Http\Requests\AdminOrganizationUpdateRequest;
use FangaBase\Http\Requests\AdminPaginationRequest;
use FangaBase\Http\Requests\AdminUserUpdateRequest;
use Illuminate\Http\JsonResponse;

final class PlatformAdminController
{
    use ResolvesActor;

    public function users(AdminPaginationRequest $request, PlatformAdministrationService $administration): JsonResponse
    {
        $input = $request->validated();

        return response()->json($administration->users($this->actor($request), (int) ($input['page'] ?? 1), (int) ($input['per_page'] ?? 25)));
    }

    public function organizations(AdminPaginationRequest $request, PlatformAdministrationService $administration): JsonResponse
    {
        $input = $request->validated();

        return response()->json($administration->organizations($this->actor($request), (int) ($input['page'] ?? 1), (int) ($input['per_page'] ?? 25)));
    }

    public function updateUser(AdminUserUpdateRequest $request, string $user, PlatformAdministrationService $administration): JsonResponse
    {
        $input = $request->validated();
        $administration->updateUser($this->actor($request), $user, $input['role'] ?? null, $input['status'] ?? null, $input['reason']);

        return response()->json(['message' => 'Utilisateur mis a jour']);
    }

    public function updateOrganization(AdminOrganizationUpdateRequest $request, string $organization, PlatformAdministrationService $administration): JsonResponse
    {
        $input = $request->validated();
        $administration->updateOrganization($this->actor($request), $organization, $input['status'], $input['reason']);

        return response()->json(['message' => 'Organisation mise a jour']);
    }
}
