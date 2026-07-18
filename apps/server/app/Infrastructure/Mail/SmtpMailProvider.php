<?php
declare(strict_types=1);
namespace FangaBase\Infrastructure\Mail;
use FangaBase\Domain\Infrastructure\Mail\MailDeliveryResult;
use FangaBase\Domain\Infrastructure\Mail\MailMessage;
use FangaBase\Domain\Infrastructure\Mail\SmtpTransport;
use FangaBase\Domain\Infrastructure\Mail\TransactionalMailProvider;
final readonly class SmtpMailProvider implements TransactionalMailProvider
{
    public function __construct(private ?SmtpTransport $transport) {}
    public function name(): string { return 'smtp'; }
    public function send(MailMessage $message): MailDeliveryResult
    {
        if ($this->transport === null) return MailDeliveryResult::disabled();
        try { return MailDeliveryResult::sent($this->transport->send($message)); }
        catch (\Symfony\Component\Mailer\Exception\TransportExceptionInterface) { return MailDeliveryResult::temporary('PROVIDER_UNAVAILABLE'); }
        catch (\Throwable) { return MailDeliveryResult::permanent('PROVIDER_REJECTED'); }
    }
}
