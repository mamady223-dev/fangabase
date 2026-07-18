<?php

declare(strict_types=1);

namespace FangaBase\Policies;

use FangaBase\Domain\Identity\AuthenticatedActor;

final class PlatformAdminPolicy
{
    public function view(AuthenticatedActor $actor): bool
    {
        return in_array($actor->globalRole, ['ADMIN', 'SUPERADMIN'], true);
    }

    public function mutate(AuthenticatedActor $actor): bool
    {
        return $actor->globalRole === 'SUPERADMIN';
    }
}
