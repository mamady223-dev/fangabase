<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\Request;

trait ResolvesActor
{
    private function actor(Request $request): AuthenticatedActor
    {
        $actor = $request->attributes->get('actor');
        if (! $actor instanceof AuthenticatedActor) {
            throw ApiProblem::auth();
        }

        return $actor;
    }
}
