<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Storage;

final readonly class StorageCapabilities
{
    public function __construct(public bool $privateObjects, public bool $signedUrls, public bool $streaming, public bool $serverSideEncryption) {}
}
