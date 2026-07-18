<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Domain\Organizations\LocalOrganizationInvitationProvider;
use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class TenantIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
    }

    public function test_owner_can_create_list_read_and_update_organization(): void
    {
        $owner = $this->account('owner@example.test');
        $organizationId = $this->createOrganization($owner, 'Equipe Fanga', 'equipe-fanga');

        $this->read($owner, '/api/organizations')->assertOk()->assertJsonCount(1, 'organizations');
        $this->read($owner, '/api/organizations/'.$organizationId)->assertOk()->assertJsonPath('organization.role', 'OWNER');
        $this->mutate($owner, 'PATCH', '/api/organizations/'.$organizationId, ['name' => 'Equipe Fanga Plus'])
            ->assertOk()->assertJsonPath('organization.name', 'Equipe Fanga Plus');
    }

    public function test_invitation_is_hashed_expiring_single_use_and_scoped_to_organization(): void
    {
        $owner = $this->account('owner@example.test');
        $guest = $this->account('guest@example.test');
        $first = $this->createOrganization($owner, 'Premiere', 'premiere');
        $second = $this->createOrganization($owner, 'Seconde', 'seconde');
        $this->mutate($owner, 'POST', '/api/organizations/'.$first.'/invitations', ['email' => 'guest@example.test', 'role' => 'MEMBER'])->assertAccepted();
        $token = app(LocalOrganizationInvitationProvider::class)->token($first, 'guest@example.test');

        $this->assertDatabaseHas('organization_invitations', ['organization_id' => $first, 'token_hash' => hash('sha256', $token)]);
        $this->assertDatabaseMissing('organization_invitations', ['token_hash' => $token]);
        $this->mutate($guest, 'POST', '/api/organizations/'.$second.'/invitations/'.$token.'/accept')->assertNotFound();
        $this->mutate($guest, 'POST', '/api/organizations/'.$first.'/invitations/'.$token.'/accept')->assertOk();
        $this->mutate($guest, 'POST', '/api/organizations/'.$first.'/invitations/'.$token.'/accept')->assertNotFound();
        $this->read($guest, '/api/organizations/'.$first)->assertOk();
    }

    public function test_expired_and_wrong_recipient_invitations_are_not_enumerable(): void
    {
        $owner = $this->account('owner@example.test');
        $guest = $this->account('guest@example.test');
        $other = $this->account('other@example.test');
        $organizationId = $this->createOrganization($owner, 'Expiree', 'expiree');
        $this->mutate($owner, 'POST', '/api/organizations/'.$organizationId.'/invitations', ['email' => 'guest@example.test', 'role' => 'MEMBER']);
        $token = app(LocalOrganizationInvitationProvider::class)->token($organizationId, 'guest@example.test');

        $wrong = $this->mutate($other, 'POST', '/api/organizations/'.$organizationId.'/invitations/'.$token.'/accept');
        DB::table('organization_invitations')->update(['expires_at' => now()->subSecond()]);
        $expired = $this->mutate($guest, 'POST', '/api/organizations/'.$organizationId.'/invitations/'.$token.'/accept');

        $wrong->assertNotFound()->assertJsonPath('error.code', 'NOT_FOUND');
        $expired->assertNotFound()->assertJsonPath('error.code', 'NOT_FOUND');
    }

    public function test_invited_user_can_refuse_without_creating_membership(): void
    {
        $owner = $this->account('owner@example.test');
        $guest = $this->account('guest@example.test');
        $organizationId = $this->createOrganization($owner, 'Refus', 'refus');
        $this->mutate($owner, 'POST', '/api/organizations/'.$organizationId.'/invitations', ['email' => 'guest@example.test', 'role' => 'MEMBER']);
        $token = app(LocalOrganizationInvitationProvider::class)->token($organizationId, 'guest@example.test');

        $this->mutate($guest, 'POST', '/api/organizations/'.$organizationId.'/invitations/'.$token.'/refuse')->assertOk();
        $this->assertDatabaseHas('organization_invitations', ['token_hash' => hash('sha256', $token), 'status' => 'DECLINED']);
        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organizationId,
            'user_id' => DB::table('users')->where('email', 'guest@example.test')->value('id'),
        ]);
    }

    public function test_foreign_read_update_and_guessed_uuid_return_not_found(): void
    {
        $owner = $this->account('owner@example.test');
        $outsider = $this->account('outsider@example.test');
        $organizationId = $this->createOrganization($owner, 'Privee', 'privee');

        $this->read($outsider, '/api/organizations/'.$organizationId)->assertNotFound();
        $this->mutate($outsider, 'PATCH', '/api/organizations/'.$organizationId, ['name' => 'Vol'])->assertNotFound();
        $this->read($outsider, '/api/organizations/'.Str::uuid())->assertNotFound();
    }

    public function test_frontend_cannot_switch_organization_id_in_payload(): void
    {
        $owner = $this->account('owner@example.test');
        $first = $this->createOrganization($owner, 'Premiere', 'premiere');
        $second = $this->createOrganization($owner, 'Seconde', 'seconde');

        $this->mutate($owner, 'PATCH', '/api/organizations/'.$first, ['name' => 'Fraude', 'organization_id' => $second])
            ->assertUnprocessable();
        self::assertSame('Premiere', DB::table('organizations')->where('id', $first)->value('name'));
    }

    public function test_removed_or_suspended_membership_loses_access_immediately(): void
    {
        [$owner, $member, $organizationId] = $this->organizationWithMember();
        $memberId = DB::table('users')->where('email', 'member@example.test')->value('id');

        $this->mutate($owner, 'PATCH', '/api/organizations/'.$organizationId.'/members/'.$memberId, ['status' => 'SUSPENDED'])->assertOk();
        $this->read($member, '/api/organizations/'.$organizationId)->assertNotFound();
        $this->mutate($owner, 'PATCH', '/api/organizations/'.$organizationId.'/members/'.$memberId, ['status' => 'ACTIVE'])->assertOk();
        $this->mutate($owner, 'DELETE', '/api/organizations/'.$organizationId.'/members/'.$memberId)->assertOk();
        $this->read($member, '/api/organizations/'.$organizationId)->assertNotFound();
    }

    public function test_member_cannot_update_invite_or_promote_itself(): void
    {
        [, $member, $organizationId] = $this->organizationWithMember();
        $memberId = DB::table('users')->where('email', 'member@example.test')->value('id');

        $this->mutate($member, 'PATCH', '/api/organizations/'.$organizationId, ['name' => 'Interdit'])->assertForbidden();
        $this->mutate($member, 'POST', '/api/organizations/'.$organizationId.'/invitations', ['email' => 'x@example.test', 'role' => 'ADMIN'])->assertForbidden();
        $this->mutate($member, 'PATCH', '/api/organizations/'.$organizationId.'/members/'.$memberId, ['role' => 'OWNER'])->assertNotFound();
        $this->assertDatabaseHas('organization_members', ['user_id' => $memberId, 'role' => 'MEMBER']);
    }

    public function test_suspended_organization_allows_read_but_blocks_mutations(): void
    {
        $owner = $this->account('owner@example.test');
        $organizationId = $this->createOrganization($owner, 'Suspendue', 'suspendue');
        DB::table('organizations')->where('id', $organizationId)->update(['status' => 'SUSPENDED', 'suspended_at' => now()]);

        $this->read($owner, '/api/organizations/'.$organizationId)->assertOk();
        $this->mutate($owner, 'PATCH', '/api/organizations/'.$organizationId, ['name' => 'Bloquee'])->assertForbidden();
    }

    public function test_tenant_mutations_require_strict_csrf(): void
    {
        $owner = $this->account('owner@example.test');

        $this->withCredentials()
            ->withUnencryptedCookie('fangabase_refresh', $owner['refresh'])
            ->postJson('/api/organizations', ['name' => 'Sans CSRF', 'slug' => 'sans-csrf'])
            ->assertStatus(419)->assertJsonPath('error.code', 'CSRF_INVALID');
    }

    public function test_member_can_leave_but_last_owner_cannot(): void
    {
        [$owner, $member, $organizationId] = $this->organizationWithMember();

        $this->mutate($member, 'POST', '/api/organizations/'.$organizationId.'/leave')->assertOk();
        $this->read($member, '/api/organizations/'.$organizationId)->assertNotFound();
        $this->mutate($owner, 'POST', '/api/organizations/'.$organizationId.'/leave')
            ->assertConflict()->assertJsonPath('error.code', 'LAST_ORGANIZATION_OWNER');
    }

    /** @return array{array{refresh:string,csrf:string},array{refresh:string,csrf:string},string} */
    private function organizationWithMember(): array
    {
        $owner = $this->account('owner@example.test');
        $member = $this->account('member@example.test');
        $organizationId = $this->createOrganization($owner, 'Partagee', 'partagee');
        $this->mutate($owner, 'POST', '/api/organizations/'.$organizationId.'/invitations', ['email' => 'member@example.test', 'role' => 'MEMBER']);
        $token = app(LocalOrganizationInvitationProvider::class)->token($organizationId, 'member@example.test');
        $this->mutate($member, 'POST', '/api/organizations/'.$organizationId.'/invitations/'.$token.'/accept')->assertOk();

        return [$owner, $member, $organizationId];
    }

    /** @return array{refresh:string,csrf:string} */
    private function account(string $email): array
    {
        $this->postJson('/api/auth/register', ['email' => $email, 'password' => 'LongPassword42'])->assertCreated();
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'LongPassword42'])->assertOk();

        return ['refresh' => $this->cookie($response, 'fangabase_refresh'), 'csrf' => $this->cookie($response, 'fangabase_csrf')];
    }

    /** @param array{refresh:string,csrf:string} $session */
    private function createOrganization(array $session, string $name, string $slug): string
    {
        $response = $this->mutate($session, 'POST', '/api/organizations', ['name' => $name, 'slug' => $slug])->assertCreated();

        return (string) $response->json('organization.id');
    }

    /** @param array{refresh:string,csrf:string} $session */
    private function read(array $session, string $path): \Illuminate\Testing\TestResponse
    {
        return $this->withCredentials()->withUnencryptedCookie('fangabase_refresh', $session['refresh'])->getJson($path);
    }

    /** @param array{refresh:string,csrf:string} $session */
    private function mutate(array $session, string $method, string $path, array $data = []): \Illuminate\Testing\TestResponse
    {
        return $this->withCredentials()
            ->withUnencryptedCookie('fangabase_refresh', $session['refresh'])
            ->withUnencryptedCookie('fangabase_csrf', $session['csrf'])
            ->withHeader('X-CSRF-TOKEN', $session['csrf'])
            ->json($method, $path, $data);
    }

    private function cookie(\Illuminate\Testing\TestResponse $response, string $name): string
    {
        $cookie = $response->getCookie($name, false);
        self::assertNotNull($cookie);

        return (string) $cookie->getValue();
    }
}
