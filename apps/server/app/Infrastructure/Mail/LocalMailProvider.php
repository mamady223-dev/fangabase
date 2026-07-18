<?php

declare(strict_types=1);

namespace FangaBase\Infrastructure\Mail;

use FangaBase\Domain\Infrastructure\Mail\MailDeliveryResult;
use FangaBase\Domain\Infrastructure\Mail\MailMessage;
use FangaBase\Domain\Infrastructure\Mail\TransactionalMailProvider;

final readonly class LocalMailProvider implements TransactionalMailProvider
{
    /** @param \Closure(MailMessage): void|null $sink */
    public function __construct(private ?\Closure $sink = null) {}
    public function name(): string { return 'local'; }
    public function send(MailMessage $message): MailDeliveryResult
    {
        if ($this->sink !== null) ($this->sink)($message);
        return MailDeliveryResult::sent('local-'.hash('sha256', $message->idempotencyKey));
    }
}
