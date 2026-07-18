<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CatalogService
{
    public function publicCatalog(int $page, int $perPage): array
    {
        $perPage = max(1, min(50, $perPage)); $page = max(1, $page);
        $query = DB::table('products')->where('active', true)->whereNull('archived_at')->orderBy('name');
        $products = $query->forPage($page, $perPage)->get()->map(function ($product): array {
            $plans = DB::table('plans')->where('product_id', $product->id)->where('active', true)->whereNull('archived_at')->get();
            return ['id' => $product->id, 'slug' => $product->slug, 'name' => $product->name, 'description' => $product->description, 'purchase_mode' => $product->purchase_mode, 'terms_version' => $product->terms_version,
                'plans' => $plans->map(fn ($plan): array => ['id' => $plan->id, 'slug' => $plan->slug, 'name' => $plan->name, 'interval' => $plan->interval, 'included_credits' => (int) $plan->included_credits, 'features' => json_decode((string) $plan->entitlements, true), 'prices' => DB::table('prices')->where('plan_id', $plan->id)->where('active', true)->whereNull('archived_at')->get(['id', 'amount_minor', 'currency', 'interval', 'terms_version'])->all()])->all()];
        })->all();
        return ['data' => $products, 'page' => $page, 'per_page' => $perPage, 'total' => $query->count()];
    }

    public function create(AuthenticatedActor $actor, array $input): array
    {
        $this->admin($actor); $this->validateCurrency((string) $input['currency']);
        if (! is_int($input['amount_minor']) || $input['amount_minor'] <= 0) throw ApiProblem::validation();
        return DB::transaction(function () use ($input): array {
            $now = now(); $productId = (string) Str::uuid(); $planId = (string) Str::uuid(); $priceId = (string) Str::uuid();
            DB::table('products')->insert(['id' => $productId, 'slug' => $input['slug'], 'name' => $input['name'], 'description' => $input['description'] ?? null, 'purchase_mode' => $input['purchase_mode'], 'terms_version' => $input['terms_version'], 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
            DB::table('plans')->insert(['id' => $planId, 'product_id' => $productId, 'slug' => $input['plan_slug'], 'name' => $input['plan_name'], 'amount_minor' => $input['amount_minor'], 'currency' => strtoupper($input['currency']), 'interval' => $input['interval'], 'included_credits' => $input['included_credits'], 'entitlements' => json_encode($input['features'], JSON_THROW_ON_ERROR), 'terms_version' => $input['terms_version'], 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
            DB::table('prices')->insert(['id' => $priceId, 'product_id' => $productId, 'plan_id' => $planId, 'amount_minor' => $input['amount_minor'], 'currency' => strtoupper($input['currency']), 'interval' => $input['interval'], 'terms_version' => $input['terms_version'], 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
            return compact('productId', 'planId', 'priceId');
        });
    }
    public function archivePrice(AuthenticatedActor $actor, string $priceId): void { $this->admin($actor); if (DB::table('prices')->where('id', $priceId)->whereNull('archived_at')->update(['active' => false, 'archived_at' => now(), 'updated_at' => now()]) !== 1) throw ApiProblem::notFound(); }
    public function serverPrice(string $priceId): object { $price = DB::table('prices')->where('id', $priceId)->where('active', true)->whereNull('archived_at')->first(); if ($price === null || (int) $price->amount_minor <= 0) throw ApiProblem::notFound(); return $price; }
    private function admin(AuthenticatedActor $actor): void { if ($actor->globalRole !== 'SUPERADMIN') throw ApiProblem::forbidden(); }
    private function validateCurrency(string $currency): void { if (preg_match('/^[A-Z]{3}$/', strtoupper($currency)) !== 1) throw ApiProblem::validation(); }
}
