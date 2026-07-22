<?php

declare(strict_types=1);

use FangaBase\Domain\Infrastructure\Mail\EmailOutboxWorker;
use FangaBase\Domain\Identity\RefreshSessionService;
use FangaBase\Domain\Payments\PaymentMaintenanceService;
use FangaBase\Domain\Withdrawals\PayoutWorker;
use FangaBase\Domain\Withdrawals\WithdrawalReconciliationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('fangabase:mail-worker {--once} {--limit=25}', function (EmailOutboxWorker $worker): int {
    $limit = max(1, min(100, (int) $this->option('limit')));
    do {
        $processed = $worker->runOnce($limit);
        $this->line(json_encode(['processed' => $processed], JSON_THROW_ON_ERROR));
        if ($this->option('once')) break;
        if ($processed === 0) sleep(2);
    } while (true);
    return self::SUCCESS;
})->purpose('Traite durablement les e-mails transactionnels FangaBase');

Artisan::command('fangabase:doctor', function (): int {
    $this->line(json_encode(['php' => PHP_VERSION, 'environment' => app()->environment(), 'ok' => true], JSON_THROW_ON_ERROR));
    return self::SUCCESS;
})->purpose('Diagnostique le runtime FangaBase sans afficher de secret');

Artisan::command('fangabase:sessions:cleanup', function (RefreshSessionService $sessions): int {
    $this->line(json_encode(['deleted' => $sessions->cleanupExpired()], JSON_THROW_ON_ERROR));

    return self::SUCCESS;
})->purpose('Supprime les sessions de rafraichissement expirees');

Artisan::command('fangabase:payments:cleanup', function (PaymentMaintenanceService $payments): int {
    $this->line(json_encode(['expired' => $payments->expirePending()], JSON_THROW_ON_ERROR));
    return self::SUCCESS;
})->purpose('Expire les ordres et tentatives de paiement arrives a echeance');

Artisan::command('fangabase:payout-worker {--once} {--limit=25}', function (PayoutWorker $worker): int {
    $limit = max(1, min(100, (int) $this->option('limit'))); do { $processed = $worker->runOnce($limit); $this->line(json_encode(['processed' => $processed], JSON_THROW_ON_ERROR)); if ($this->option('once')) break; if ($processed === 0) sleep(2); } while (true); return self::SUCCESS;
})->purpose('Traite les retraits approuves avec baux et reprise');

Artisan::command('fangabase:withdrawals:reconcile {provider}', function (WithdrawalReconciliationService $service): int { $this->line(json_encode($service->run((string) $this->argument('provider')), JSON_THROW_ON_ERROR)); return self::SUCCESS; })->purpose('Rapproche retraits, ledger et statut fournisseur');

Schedule::command('fangabase:sessions:cleanup')->daily()->withoutOverlapping();
Schedule::command('fangabase:payments:cleanup')->hourly()->withoutOverlapping();
Schedule::command('fangabase:mail-worker --once --limit=25')->everyMinute()->withoutOverlapping();
Schedule::command('fangabase:payout-worker --once --limit=25')->everyMinute()->withoutOverlapping();
