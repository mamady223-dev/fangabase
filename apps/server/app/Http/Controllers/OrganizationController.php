<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Organizations\OrganizationService;
use FangaBase\Http\Requests\StoreOrganizationRequest;
use FangaBase\Http\Requests\UpdateOrganizationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrganizationController
{
    use ResolvesActor;

    public function index(Request $request, OrganizationService $organizations): JsonResponse
    {
        return response()->json(['organizations' => $organizations->list($this->actor($request))]);
    }

    public function store(StoreOrganizationRequest $request, OrganizationService $organizations): JsonResponse
    {
        $input = $request->validated();

        return response()->json(['organization' => $organizations->create($this->actor($request), $input['name'], $input['slug'])], 201);
    }

    public function show(Request $request, string $organization, OrganizationService $organizations): JsonResponse
    {
        return response()->json(['organization' => $organizations->get($this->actor($request), $organization)]);
    }

    public function update(UpdateOrganizationRequest $request, string $organization, OrganizationService $organizations): JsonResponse
    {
        return response()->json(['organization' => $organizations->update($this->actor($request), $organization, $request->validated('name'))]);
    }
}
