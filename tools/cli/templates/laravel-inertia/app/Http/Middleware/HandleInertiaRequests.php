<?php

declare(strict_types=1);

namespace FangaBase\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

final class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => ['user' => $user ? [
                'id' => (string) $user->getAuthIdentifier(),
                'name' => (string) $user->name,
                'email' => (string) $user->email,
            ] : null],
            'flash' => ['status' => fn () => $request->session()->get('status')],
        ];
    }
}
