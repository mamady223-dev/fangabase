<?php
declare(strict_types=1);
namespace FangaBase\Infrastructure\Mail;
use FangaBase\Domain\Infrastructure\Mail\MailMessage;
use FangaBase\Domain\Infrastructure\Mail\SmtpTransport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Email;
final readonly class SymfonySmtpTransport implements SmtpTransport
{
    public function __construct(private string $dsn) {}
    public function send(MailMessage $message): string
    {
        $email = (new Email())->from($message->sender)->to(...$message->to)->subject($message->subject)->text($message->text);
        if ($message->html !== null) $email->html($message->html);
        foreach ($message->headers as $name => $value) $email->getHeaders()->addTextHeader($name, $value);
        $sent = (new Mailer(Transport::fromDsn($this->dsn)))->send($email);
        return $sent?->getMessageId() ?? hash('sha256', $message->idempotencyKey);
    }
}
