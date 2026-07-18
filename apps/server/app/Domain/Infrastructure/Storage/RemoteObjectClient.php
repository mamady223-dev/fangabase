<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Storage;

interface RemoteObjectClient
{
    public function put(string $key, string $contents, string $mime): void;
    public function get(string $key): string;
    public function delete(string $key): void;
    public function signedUrl(string $key, \DateTimeImmutable $expiresAt): string;
}
