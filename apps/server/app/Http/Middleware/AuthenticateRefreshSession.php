<?php

declare(strict_types=1);

namespace FangaBase\Http\Middleware;

use Closure;
use FangaBase\Domain\Identity\AuthenticatedActor;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateRefreshSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie('fangabase_refresh');
        if (! is_string($token) || $token === '') {
            throw ApiProblem::auth();
        }

        $session = DB::table('refresh_sessions')
            ->join('users', 'users.id', '=', 'refresh_sessions.user_id')
            ->where('refresh_sessions.refresh_hash', hash('sha256', $token))
            ->select('refresh_sessions.*', 'users.email', 'users.role', 'users.status as user_status', 'users.session_version as current_version')
            ->first();
        if ($session === null
            || $session->revoked_at !== null
            || now()->greaterThanOrEqualTo($session->expires_at)
            || $session->user_status !== 'ACTIVE'
            || (int) $session->session_version !== (int) $session->current_version) {
            throw $session !== null && $session->user_status !== 'ACTIVE' ? ApiProblem::suspended() : ApiProblem::auth();
        }

        $request->attributes->set('actor', new AuthenticatedActor(
            (string) $session->user_id,
            (string) $session->email,
            (string) $session->role,
        ));

        return $next($request);
    }
}
