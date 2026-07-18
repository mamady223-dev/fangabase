<?php

declare(strict_types=1);

namespace FangaBase\Http\Middleware;

use Closure;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class StrictDoubleSubmitCsrf
{
    public function handle(Request $request, Closure $next): Response
    {
        $cookie = $request->cookie('fangabase_csrf');
        $header = $request->header('X-CSRF-TOKEN');

        if (! is_string($cookie) || ! is_string($header) || ! hash_equals($cookie, $header)) {
            throw ApiProblem::csrf();
        }

        return $next($request);
    }
}
