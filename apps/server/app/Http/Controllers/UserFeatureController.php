<?php

declare(strict_types=1);

namespace FangaBase\Http\Controllers;

use FangaBase\Domain\Infrastructure\Storage\PrivateStorage;
use FangaBase\Support\ApiProblem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class UserFeatureController
{
    use ResolvesActor;

    public function notifications(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $limit = max(1, min((int) $request->query('limit', 25), 100));
        $rows = DB::table('notifications')->where('user_id', $actor->id)->orderByDesc('created_at')->limit($limit)->get();

        return response()->json(['data' => $rows]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = DB::table('notifications')->where('user_id', $this->actor($request)->id)->whereNull('read_at')->count();

        return response()->json(['count' => $count]);
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $updated = DB::table('notifications')->where('id', $notification)->where('user_id', $this->actor($request)->id)->update([
            'read_at' => now(),
            'updated_at' => now(),
        ]);
        if ($updated !== 1) {
            throw ApiProblem::notFound();
        }

        return response()->json(['read' => true]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'boolean'],
            'in_app' => ['required', 'boolean'],
        ]);
        $userId = $this->actor($request)->id;
        DB::table('notification_preferences')->updateOrInsert(
            ['user_id' => $userId],
            [
                'marketing_email' => false,
                'product_email' => $input['email'],
                'in_app' => $input['in_app'],
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        return response()->json(['email' => $input['email'], 'in_app' => $input['in_app']]);
    }

    public function profile(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $user = DB::table('users')->where('id', $actor->id)->first(['id', 'email', 'role', 'status', 'email_verified_at', 'name', 'locale']);
        if (! $user) {
            throw ApiProblem::auth();
        }

        return response()->json(['user' => $user]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $input = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'locale' => ['sometimes', 'in:fr,en'],
        ]);
        if ($input !== []) {
            DB::table('users')->where('id', $this->actor($request)->id)->update([...$input, 'updated_at' => now()]);
        }

        return $this->profile($request);
    }

    public function upload(Request $request, PrivateStorage $storage): JsonResponse
    {
        $input = $request->validate([
            'name' => ['required', 'string', 'max:180', 'not_regex:/[\\\\\/]/'],
            'mime' => ['required', 'in:application/pdf,image/jpeg,image/png'],
            'content_base64' => ['required', 'string', 'max:7000000'],
        ]);
        $contents = base64_decode($input['content_base64'], true);
        if (! is_string($contents)) {
            throw ApiProblem::validation();
        }
        try {
            $stored = $storage->put($this->actor($request)->id, $contents, $input['mime']);
        } catch (\InvalidArgumentException|\RuntimeException) {
            throw ApiProblem::validation();
        }
        $id = (string) Str::uuid();
        DB::table('files')->insert([
            'id' => $id,
            'owner_id' => $this->actor($request)->id,
            'disk' => $storage->provider(),
            'path' => $stored->key,
            'mime' => $stored->mime,
            'size' => $stored->size,
            'is_public' => false,
            'original_name' => $input['name'],
            'checksum' => $stored->sha256,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id, 'name' => $input['name'], 'mime' => $stored->mime, 'size' => $stored->size, 'checksum' => $stored->sha256], 201);
    }

    public function download(Request $request, string $file, PrivateStorage $storage): Response
    {
        $record = DB::table('files')->where('id', $file)->where('owner_id', $this->actor($request)->id)->first();
        if (! $record) {
            throw ApiProblem::notFound();
        }
        try {
            $contents = $storage->get($this->actor($request)->id, (string) $record->path);
        } catch (\RuntimeException) {
            throw ApiProblem::notFound();
        }

        return response($contents, 200, [
            'Content-Type' => (string) $record->mime,
            'Content-Disposition' => 'attachment; filename="'.addslashes((string) ($record->original_name ?? 'file')).'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
