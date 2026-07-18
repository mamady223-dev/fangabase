<?php

declare(strict_types=1);

namespace FangaBase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AdminUserUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'role' => ['nullable', 'required_without:status', Rule::in(['USER', 'ADMIN', 'SUPERADMIN'])],
            'status' => ['nullable', 'required_without:role', Rule::in(['ACTIVE', 'SUSPENDED'])],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'organization_id' => ['prohibited'],
        ];
    }
}
