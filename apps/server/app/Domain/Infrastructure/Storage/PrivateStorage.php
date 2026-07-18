<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Storage;

interface PrivateStorage
{
    public function provider(): string;
    public function capabilities(): StorageCapabilities;
    public function put(string $tenantId, string $contents, string $declaredMime): StoredObject;
    public function get(string $tenantId, string $key): string;
    public function delete(string $tenantId, string $key, bool $authorized): void;
    public function temporaryUrl(string $tenantId, string $key, \DateTimeImmutable $expiresAt): string;
}
