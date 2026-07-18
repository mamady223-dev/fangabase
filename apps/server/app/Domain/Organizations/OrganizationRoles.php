<?php

declare(strict_types=1);

namespace FangaBase\Domain\Organizations;

final class OrganizationRoles
{
    public const OWNER = 'OWNER';
    public const ADMIN = 'ADMIN';
    public const MEMBER = 'MEMBER';
    public const ALL = [self::OWNER, self::ADMIN, self::MEMBER];
}
