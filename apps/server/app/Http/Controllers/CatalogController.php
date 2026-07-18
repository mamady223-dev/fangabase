<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Billing\CatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CatalogController
{
    use ResolvesActor;
    public function index(Request $request, CatalogService $catalog): JsonResponse { $data = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:50']]); return response()->json($catalog->publicCatalog((int) ($data['page'] ?? 1), (int) ($data['per_page'] ?? 20))); }
    public function store(Request $request, CatalogService $catalog): JsonResponse { $data = $request->validate(['slug' => ['required', 'alpha_dash', 'max:80'], 'name' => ['required', 'string', 'max:120'], 'description' => ['nullable', 'string', 'max:1000'], 'purchase_mode' => ['required', 'in:CREDITS,SUBSCRIPTION,ONE_TIME,HYBRID'], 'plan_slug' => ['required', 'alpha_dash', 'max:80'], 'plan_name' => ['required', 'string', 'max:120'], 'amount_minor' => ['required', 'integer', 'min:1'], 'currency' => ['required', 'regex:/^[A-Z]{3}$/'], 'interval' => ['required', 'in:ONE_TIME,MONTH,YEAR'], 'included_credits' => ['required', 'integer', 'min:0'], 'features' => ['required', 'array'], 'terms_version' => ['required', 'integer', 'min:1']]); return response()->json($catalog->create($this->actor($request), $data), 201); }
    public function archive(Request $request, string $price, CatalogService $catalog): JsonResponse { $catalog->archivePrice($this->actor($request), $price); return response()->json(['message' => 'Prix archivé']); }
}
