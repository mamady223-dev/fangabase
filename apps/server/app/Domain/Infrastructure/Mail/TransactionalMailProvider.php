<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

interface TransactionalMailProvider
{
    public function name(): string;
    public function send(MailMessage $message): MailDeliveryResult;
}
