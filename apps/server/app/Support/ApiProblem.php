<?php

declare(strict_types=1);

namespace FangaBase\Support;

use RuntimeException;

final class ApiProblem extends RuntimeException
{
    public function __construct(public readonly string $errorCode, public readonly int $status)
    {
        parent::__construct($errorCode);
    }

    public static function auth(): self { return new self('AUTH_REQUIRED', 401); }
    public static function suspended(): self { return new self('ACCOUNT_SUSPENDED', 403); }
    public static function forbidden(): self { return new self('FORBIDDEN', 403); }
    public static function notFound(): self { return new self('NOT_FOUND', 404); }
    public static function csrf(): self { return new self('CSRF_INVALID', 419); }
    public static function validation(): self { return new self('VALIDATION_FAILED', 422); }
    public static function tokenInvalid(): self { return new self('TOKEN_INVALID', 422); }
    public static function sessionReplay(): self { return new self('SESSION_REPLAY', 401); }
    public static function oauthInvalid(): self { return new self('OAUTH_INVALID', 401); }
    public static function conflict(string $code = 'CONFLICT'): self { return new self($code, 409); }
    public static function limited(): self { return new self('RATE_LIMITED', 429); }
}
