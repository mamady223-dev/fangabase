<?php

declare(strict_types=1);

namespace FangaBase\Domain\Infrastructure\Mail;

use Illuminate\Support\Facades\Crypt;

final readonly class OutboxMailFactory
{
    public function __construct(private string $sender, private string $publicOrigin) {}

    /** @param array<string, mixed> $payload */
    public function make(string $type, array $payload, string $idempotencyKey): MailMessage
    {
        $recipient = filter_var($payload['recipient'] ?? null, FILTER_VALIDATE_EMAIL);
        if (!is_string($recipient)) throw new \InvalidArgumentException('MAIL_PAYLOAD_INVALID');
        $token = Crypt::decryptString((string) ($payload['token_encrypted'] ?? ''));
        [$subject, $path] = match ($type) {
            'VERIFY_EMAIL' => ['Vérifiez votre adresse FangaBase', '/verify-email?token='],
            'RESET_PASSWORD' => ['Réinitialisez votre mot de passe FangaBase', '/reset-password?token='],
            'ORGANIZATION_INVITATION' => ['Invitation à rejoindre une organisation FangaBase', '/invitations/accept?token='],
            default => throw new \InvalidArgumentException('MAIL_TYPE_UNSUPPORTED'),
        };
        $url = rtrim($this->publicOrigin, '/').$path.rawurlencode($token);
        return new MailMessage($this->sender, [strtolower($recipient)], $subject, "Ouvrez ce lien sécurisé : {$url}", '<p><a href="'.htmlspecialchars($url, ENT_QUOTES).'">Continuer sur FangaBase</a></p>', $idempotencyKey);
    }
}
