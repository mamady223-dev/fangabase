<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Tests\TestCase;

final class InertiaFrontendTest extends TestCase
{
    public function test_dashboard_is_an_inertia_response_without_sensitive_props(): void
    {
        config(['session.driver' => 'array']);

        $response = $this->withHeader('X-Inertia', 'true')->get('/dashboard');
        $response->assertOk();
        $response->assertHeader('X-Inertia', 'true');
        $response->assertDontSee('client_secret');
        $response->assertDontSee('password');
    }
}
