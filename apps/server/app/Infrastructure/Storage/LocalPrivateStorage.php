<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Storage;

use FangaBase\Domain\Infrastructure\Storage\PrivateStorage;
use FangaBase\Domain\Infrastructure\Storage\StorageCapabilities;
use FangaBase\Domain\Infrastructure\Storage\StoredObject;
use Illuminate\Support\Str;

final readonly class LocalPrivateStorage implements PrivateStorage
{
    /** @param list<string> $allowedMimes */
    public function __construct(private string $root, private string $signingKey, private int $maxBytes = 10485760, private array $allowedMimes = ['application/pdf', 'image/jpeg', 'image/png']) {}
    public function provider(): string { return 'local'; }
    public function capabilities(): StorageCapabilities { return new StorageCapabilities(true, true, true, false); }

    public function put(string $tenantId, string $contents, string $declaredMime): StoredObject
    {
        $tenant = $this->tenant($tenantId);
        $size = strlen($contents);
        if ($size === 0 || $size > $this->maxBytes) throw new \RuntimeException('FILE_SIZE_INVALID');
        $detected = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
        if (!is_string($detected) || $detected !== $declaredMime || !in_array($detected, $this->allowedMimes, true)) throw new \RuntimeException('FILE_MIME_INVALID');
        $key = $tenant.'/'.Str::uuid()->toString();
        $path = $this->path($key);
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new \RuntimeException('STORAGE_WRITE_FAILED');
        if (file_put_contents($path, $contents, LOCK_EX) !== $size) throw new \RuntimeException('STORAGE_WRITE_FAILED');
        chmod($path, 0600);
        return new StoredObject($key, $detected, $size, hash('sha256', $contents));
    }

    public function get(string $tenantId, string $key): string
    {
        $this->assertOwned($tenantId, $key);
        $contents = @file_get_contents($this->path($key));
        if ($contents === false) throw new \RuntimeException('FILE_NOT_FOUND');
        return $contents;
    }

    public function delete(string $tenantId, string $key, bool $authorized): void
    {
        if (!$authorized) throw new \RuntimeException('STORAGE_DELETE_FORBIDDEN');
        $this->assertOwned($tenantId, $key);
        $path = $this->path($key);
        if (is_file($path) && !unlink($path)) throw new \RuntimeException('STORAGE_DELETE_FAILED');
    }

    public function temporaryUrl(string $tenantId, string $key, \DateTimeImmutable $expiresAt): string
    {
        $this->assertOwned($tenantId, $key);
        $expiry = $expiresAt->getTimestamp();
        if ($expiry <= time() || $expiry > time() + 3600) throw new \RuntimeException('SIGNED_URL_EXPIRY_INVALID');
        $signature = hash_hmac('sha256', $key.'|'.$expiry, $this->signingKey);
        return '/api/files/private?key='.rawurlencode($key).'&expires='.$expiry.'&signature='.$signature;
    }

    private function tenant(string $tenantId): string
    {
        if (preg_match('/^[a-zA-Z0-9-]{1,64}$/', $tenantId) !== 1) throw new \InvalidArgumentException('TENANT_ID_INVALID');
        return $tenantId;
    }
    private function assertOwned(string $tenantId, string $key): void
    {
        if (!str_starts_with($key, $this->tenant($tenantId).'/') || preg_match('#^[a-zA-Z0-9-]+/[a-f0-9-]+$#', $key) !== 1) throw new \RuntimeException('FILE_SCOPE_INVALID');
    }
    private function path(string $key): string { return rtrim($this->root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $key); }
}
