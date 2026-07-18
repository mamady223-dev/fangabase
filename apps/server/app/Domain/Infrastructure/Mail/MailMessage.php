<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

final readonly class MailMessage
{
    /** @param list<string> $to @param array<string, string> $headers */
    public function __construct(
        public string $sender,
        public array $to,
        public string $subject,
        public string $text,
        public ?string $html,
        public string $idempotencyKey,
        public array $headers = [],
    ) {
        if ($to === [] || $idempotencyKey === '' || strlen($idempotencyKey) > 256) {
            throw new \InvalidArgumentException('MAIL_MESSAGE_INVALID');
        }
        foreach ([$sender, $subject, $idempotencyKey, ...$to, ...array_keys($headers), ...array_values($headers)] as $value) {
            if (preg_match('/[\r\n]/', $value) === 1) {
                throw new \InvalidArgumentException('MAIL_HEADER_INVALID');
            }
        }
    }
}
