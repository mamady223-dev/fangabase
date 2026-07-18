<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Storage;

final readonly class StoredObject
{
    public function __construct(public string $key, public string $mime, public int $size, public string $sha256) {}
}
