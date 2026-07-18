<?php

declare(strict_types=1);

namespace FangaBase\Domain\Billing;

use FangaBase\Support\ApiProblem;

final readonly class BillingScope
{
    public function __construct(public string $type, public string $id)
    {
        if (! in_array($type, ['USER', 'ORGANIZATION'], true) || preg_match('/^[a-f0-9-]{36}$/i', $id) !== 1) throw ApiProblem::validation();
    }
    public function key(): string { return $this->type.':'.$this->id; }
}
