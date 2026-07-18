<?php

declare(strict_types=1);

namespace FangaBase\Tests\Feature;

use FangaBase\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

final class PlatformAdministrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame(0, Artisan::call('migrate:fresh', ['--force' => true]));
    }

    public function test_tenant_owner_has_no_platform_admin_permission(): void
    {
        $owner = $this->account('owner@example.test');
        $this->mutate($owner, 'POST', '/api/organizations', ['name' => 'Tenant', 'slug' => 'tenant'])->assertCreated();

        $this->read($owner, '/api/admin/users')->assertForbidden();
        $this->assertDatabaseHas('users', ['email' => 'owner@example.test', 'role' => 'USER']);
    }

    public function test_global_admin_can_list_with_strict_pagination_but_cannot_mutate(): void
    {
        $admin = $this->account('admin@example.test');
        $target = $this->account('target@example.test');
        DB::table('users')->where('email', 'admin@example.test')->update(['role' => 'ADMIN']);
        $targetId = DB::table('users')->where('email', 'target@example.test')->value('id');

        $this->read($admin, '/api/admin/users?per_page=1&page=1')
            ->assertOk()->assertJsonPath('per_page', 1)->assertJsonCount(1, 'data');
        $this->read($admin, '/api/admin/users?per_page=101')->assertUnprocessable();
        $this->mutate($admin, 'PATCH', '/api/admin/users/'.$targetId, ['status' => 'SUSPENDED', 'reason' => 'Controle securite'])
            ->assertForbidden();
    }

    public function test_superadmin_suspends_user_revokes_sessions_and_audits_action(): void
    {
        $superadmin = $this->superadmin('root@example.test');
        $target = $this->account('target@example.test');
        $targetId = DB::table('users')->where('email', 'target@example.test')->value('id');

        $this->mutate($superadmin, 'PATCH', '/api/admin/users/'.$targetId, [
            'status' => 'SUSPENDED',
            'reason' => 'Activite abusive confirmee',
        ])->assertOk();

        $this->assertDatabaseHas('users', ['id' => $targetId, 'status' => 'SUSPENDED']);
        $this->assertSame(0, DB::table('refresh_sessions')->where('user_id', $targetId)->whereNull('revoked_at')->count());
        $this->read($target, '/api/organizations')->assertForbidden();
        $this->postJson('/api/auth/login', ['email' => 'target@example.test', 'password' => 'LongPassword42'])->assertForbidden();
        $this->assertDatabaseHas('audit_events', [
            'actor_id' => DB::table('users')->where('email', 'root@example.test')->value('id'),
            'action' => 'PLATFORM_USER_UPDATED',
            'target_id' => $targetId,
            'reason' => 'Activite abusive confirmee',
        ]);
    }

    public function test_last_active_superadmin_cannot_suspend_or_demote_self(): void
    {
        $root = $this->superadmin('root@example.test');
        $rootId = DB::table('users')->where('email', 'root@example.test')->value('id');

        $this->mutate($root, 'PATCH', '/api/admin/users/'.$rootId, ['status' => 'SUSPENDED', 'reason' => 'Auto suspension'])
            ->assertConflict()->assertJsonPath('error.code', 'LAST_SUPERADMIN');
        $this->mutate($root, 'PATCH', '/api/admin/users/'.$rootId, ['role' => 'ADMIN', 'reason' => 'Auto retrogradation'])
            ->assertConflict()->assertJsonPath('error.code', 'LAST_SUPERADMIN');
        $this->assertDatabaseHas('users', ['id' => $rootId, 'role' => 'SUPERADMIN', 'status' => 'ACTIVE']);
    }

    public function test_superadmin_change_is_allowed_when_another_active_superadmin_exists(): void
    {
        $first = $this->superadmin('first@example.test');
        $this->superadmin('second@example.test');
        $firstId = DB::table('users')->where('email', 'first@example.test')->value('id');

        $this->mutate($first, 'PATCH', '/api/admin/users/'.$firstId, ['role' => 'ADMIN', 'reason' => 'Rotation des responsabilites'])
            ->assertOk();
        $this->assertDatabaseHas('users', ['id' => $firstId, 'role' => 'ADMIN']);
        self::assertSame(1, DB::table('users')->where('role', 'SUPERADMIN')->where('status', 'ACTIVE')->count());
    }

    public function test_superadmin_suspends_and_reactivates_organization_with_audit(): void
    {
        $root = $this->superadmin('root@example.test');
        $owner = $this->account('owner@example.test');
        $organizationId = (string) $this->mutate($owner, 'POST', '/api/organizations', ['name' => 'Societe', 'slug' => 'societe'])
            ->assertCreated()->json('organization.id');

        $this->mutate($root, 'PATCH', '/api/admin/organizations/'.$organizationId, ['status' => 'SUSPENDED', 'reason' => 'Verification conformite'])
            ->assertOk();
        $this->read($owner, '/api/organizations/'.$organizationId)->assertOk();
        $this->mutate($owner, 'PATCH', '/api/organizations/'.$organizationId, ['name' => 'Interdit'])->assertForbidden();
        $this->mutate($root, 'PATCH', '/api/admin/organizations/'.$organizationId, ['status' => 'ACTIVE', 'reason' => 'Verification terminee'])
            ->assertOk();
        $this->mutate($owner, 'PATCH', '/api/organizations/'.$organizationId, ['name' => 'Autorise'])->assertOk();
        $this->assertDatabaseHas('audit_events', ['organization_id' => $organizationId, 'action' => 'PLATFORM_ORGANIZATION_SUSPENDED']);
        $this->assertDatabaseHas('audit_events', ['organization_id' => $organizationId, 'action' => 'PLATFORM_ORGANIZATION_ACTIVE']);
    }

    /** @return array{refresh:string,csrf:string} */
    private function superadmin(string $email): array
    {
        $session = $this->account($email);
        DB::table('users')->where('email', $email)->update(['role' => 'SUPERADMIN']);

        return $session;
    }

    /** @return array{refresh:string,csrf:string} */
    private function account(string $email): array
    {
        $this->postJson('/api/auth/register', ['email' => $email, 'password' => 'LongPassword42'])->assertCreated();
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'LongPassword42'])->assertOk();

        return ['refresh' => $this->cookie($response, 'fangabase_refresh'), 'csrf' => $this->cookie($response, 'fangabase_csrf')];
    }

    /** @param array{refresh:string,csrf:string} $session */
    private function read(array $session, string $path): \Illuminate\Testing\TestResponse
    {
        return $this->withCredentials()->withUnencryptedCookie('fangabase_refresh', $session['refresh'])->getJson($path);
    }

    /** @param array{refresh:string,csrf:string} $session */
    private function mutate(array $session, string $method, string $path, array $data): \Illuminate\Testing\TestResponse
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
