<?php

declare(strict_types=1);

namespace FangaBase\Tests\Unit;

use FangaBase\Infrastructure\Storage\LocalPrivateStorage;
use PHPUnit\Framework\TestCase;

final class PrivateStorageTest extends TestCase
{
    private string $root;
    protected function setUp(): void { $this->root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'fangabase-'.bin2hex(random_bytes(6)); }
    protected function tearDown(): void
    {
        if (!is_dir($this->root)) return;
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->root, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($iterator as $item) $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        rmdir($this->root);
    }
    public function test_private_file_is_scoped_hashed_and_readable(): void
    {
        $storage = new LocalPrivateStorage($this->root, 'test-signing-key');
        $content = "%PDF-1.4\nFangaBase";
        $file = $storage->put('tenant-a', $content, 'application/pdf');
        self::assertStringStartsWith('tenant-a/', $file->key);
        self::assertSame(hash('sha256', $content), $file->sha256);
        self::assertSame($content, $storage->get('tenant-a', $file->key));
    }
    public function test_cross_tenant_and_traversal_are_rejected(): void
    {
        $storage = new LocalPrivateStorage($this->root, 'key');
        $this->expectException(\RuntimeException::class);
        $storage->get('tenant-a', 'tenant-b/../../secret');
    }
    public function test_mime_mismatch_is_rejected(): void
    {
        $storage = new LocalPrivateStorage($this->root, 'key');
        $this->expectException(\RuntimeException::class);
        $storage->put('tenant-a', 'plain text', 'application/pdf');
    }
    public function test_delete_requires_explicit_authorization(): void
    {
        $storage = new LocalPrivateStorage($this->root, 'key');
        $file = $storage->put('tenant-a', "%PDF-1.4\nFangaBase", 'application/pdf');
        $this->expectException(\RuntimeException::class);
        $storage->delete('tenant-a', $file->key, false);
    }
}
