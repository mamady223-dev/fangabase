<?php

declare(strict_types=1);

namespace FangaBase\Support;

final class StableErrors
{
    private const MESSAGES = [
        'AUTH_REQUIRED' => 'Authentification requise',
        'ACCOUNT_SUSPENDED' => 'Compte indisponible',
        'FORBIDDEN' => 'Action interdite',
        'NOT_FOUND' => 'Ressource introuvable',
        'CSRF_INVALID' => 'Requete non autorisee',
        'VALIDATION_FAILED' => 'Donnees invalides',
        'CONFLICT' => 'Conflit avec l etat courant',
        'IDEMPOTENCY_BODY_MISMATCH' => 'Cle deja utilisee pour une autre demande',
        'RATE_LIMITED' => 'Trop de tentatives',
        'OAUTH_INVALID' => 'Connexion externe invalide',
    ];

    public static function payload(ApiProblem $problem, string $requestId): array
    {
        return ['error' => ['code' => $problem->errorCode, 'message' => self::MESSAGES[$problem->errorCode] ?? 'Erreur', 'requestId' => $requestId]];
    }
}
