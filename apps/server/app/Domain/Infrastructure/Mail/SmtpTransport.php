<?php
declare(strict_types=1);
namespace FangaBase\Domain\Infrastructure\Mail;
interface SmtpTransport { public function send(MailMessage $message): string; }
