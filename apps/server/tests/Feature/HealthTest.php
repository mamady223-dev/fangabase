<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Tests\TestCase;

final class HealthTest extends TestCase
{
    public function testHealthOnlyConfirmsTheProcessLives(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('status', 'ok');
    }
}
