<?php

declare(strict_types=1);

use FangaBase\Domain\Identity\LocalIdentityMailProvider;
use Illuminate\Contracts\Console\Kernel;

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$email = (string) ($argv[1] ?? '');
if ($app->environment('production') || ! str_ends_with($email, '@example.invalid')) {
    fwrite(STDERR, "Lecture du jeton smoke refusée.\n");
    exit(1);
}

try {
    fwrite(STDOUT, $app->make(LocalIdentityMailProvider::class)->latestToken($email, 'VERIFY_EMAIL'));
} catch (RuntimeException) {
    exit(1);
}
