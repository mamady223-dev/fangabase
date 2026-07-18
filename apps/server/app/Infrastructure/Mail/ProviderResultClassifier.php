<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Mail;

use FangaBase\Domain\Infrastructure\Mail\MailDeliveryResult;

final class ProviderResultClassifier
{
    public static function classify(int $status, ?int $retryAfterSeconds = null): MailDeliveryResult
    {
        if ($status === 0) return MailDeliveryResult::temporary('PROVIDER_TIMEOUT');
        if ($status === 429) return MailDeliveryResult::temporary('PROVIDER_RATE_LIMITED', $retryAfterSeconds);
        if ($status >= 500) return MailDeliveryResult::temporary('PROVIDER_UNAVAILABLE');
        if ($status === 401 || $status === 403) return MailDeliveryResult::permanent('PROVIDER_AUTHENTICATION_FAILED');
        if ($status >= 400) return MailDeliveryResult::permanent('PROVIDER_REJECTED');
        return MailDeliveryResult::temporary('PROVIDER_RESPONSE_INVALID');
    }
}
