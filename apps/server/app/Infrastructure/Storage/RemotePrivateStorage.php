<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Storage;

use FangaBase\Domain\Infrastructure\Storage\PrivateStorage;
use FangaBase\Domain\Infrastructure\Storage\RemoteObjectClient;
use FangaBase\Domain\Infrastructure\Storage\StorageCapabilities;
use FangaBase\Domain\Infrastructure\Storage\StoredObject;
use Illuminate\Support\Str;

final readonly class RemotePrivateStorage implements PrivateStorage
{
    /** @param list<string> $allowedMimes */
    public function __construct(private string $name, private RemoteObjectClient $client, private int $maxBytes, private array $allowedMimes, private StorageCapabilities $features) {}
    public function provider(): string { return $this->name; }
    public function capabilities(): StorageCapabilities { return $this->features; }
    public function put(string $tenantId, string $contents, string $declaredMime): StoredObject
    {
        $this->tenant($tenantId); $size = strlen($contents); $detected = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
        if ($size === 0 || $size > $this->maxBytes) throw new \RuntimeException('FILE_SIZE_INVALID');
        if (!is_string($detected) || $detected !== $declaredMime || !in_array($detected, $this->allowedMimes, true)) throw new \RuntimeException('FILE_MIME_INVALID');
        $key = $tenantId.'/'.Str::uuid(); $this->client->put($key, $contents, $detected);
        return new StoredObject($key, $detected, $size, hash('sha256', $contents));
    }
    public function get(string $tenantId, string $key): string { $this->owned($tenantId, $key); return $this->client->get($key); }
    public function delete(string $tenantId, string $key, bool $authorized): void { if (!$authorized) throw new \RuntimeException('STORAGE_DELETE_FORBIDDEN'); $this->owned($tenantId, $key); $this->client->delete($key); }
    public function temporaryUrl(string $tenantId, string $key, \DateTimeImmutable $expiresAt): string { $this->owned($tenantId, $key); if (!$this->features->signedUrls) throw new \RuntimeException('CAPABILITY_UNAVAILABLE'); return $this->client->signedUrl($key, $expiresAt); }
    private function tenant(string $id): void { if (preg_match('/^[a-zA-Z0-9-]{1,64}$/', $id) !== 1) throw new \InvalidArgumentException('TENANT_ID_INVALID'); }
    private function owned(string $tenantId, string $key): void { $this->tenant($tenantId); if (!str_starts_with($key, $tenantId.'/') || str_contains($key, '..')) throw new \RuntimeException('FILE_SCOPE_INVALID'); }
}
