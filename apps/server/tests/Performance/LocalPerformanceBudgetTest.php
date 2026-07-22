<?php

declare(strict_types=1);

namespace FangaBase\Tests\Performance;

use FangaBase\Tests\TestCase;

final class LocalPerformanceBudgetTest extends TestCase
{
    public function testLocalHealthAndReadinessStayWithinDiagnosticBudget(): void
    {
        $started = hrtime(true);
        for ($index = 0; $index < 25; $index++) {
            $this->getJson('/api/health')->assertOk();
            $this->getJson('/api/readiness')->assertOk();
        }
        $elapsedMs = (hrtime(true) - $started) / 1_000_000;

        self::assertLessThan(2_500, $elapsedMs, '50 local diagnostic requests exceeded the non-production budget');
    }
}
