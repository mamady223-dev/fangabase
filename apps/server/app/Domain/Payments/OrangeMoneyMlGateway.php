<?php

declare(strict_types=1);

namespace FangaBase\Domain\Payments;

interface OrangeMoneyMlGateway
{
    /** @return array{access_token:string,expires_in:int} */
    public function oauth(array $configuration): array;

    /** @return array<string,mixed> */
    public function checkout(array $configuration, string $accessToken, CheckoutRequest $request): array;

    /** @return array<string,mixed> */
    public function status(array $configuration, string $accessToken, string $providerReference, array $context): array;
}
