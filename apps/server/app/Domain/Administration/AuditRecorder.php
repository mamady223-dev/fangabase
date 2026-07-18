<?php

declare(strict_types=1);

namespace FangaBase\Domain\Administration;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AuditRecorder
{
    /** @param array<string, scalar|null> $metadata */
    public function record(string $actorId, ?string $organizationId, string $action, string $targetType, string $targetId, ?string $reason = null, array $metadata = []): void
    {
        DB::table('audit_events')->insert([
            'id' => (string) Str::uuid(),
            'actor_id' => $actorId,
            'organization_id' => $organizationId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'reason' => $reason,
            'safe_metadata' => json_encode($metadata, JSON_THROW_ON_ERROR),
            'occurred_at' => now(),
        ]);
    }
}
