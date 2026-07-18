<?php

declare(strict_types=1);

namespace FangaBase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateMembershipRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'role' => ['nullable', 'required_without:status', 'string', Rule::in(['OWNER', 'ADMIN', 'MEMBER'])],
            'status' => ['nullable', 'required_without:role', 'string', Rule::in(['ACTIVE', 'SUSPENDED'])],
            'organization_id' => ['prohibited'],
            'user_id' => ['prohibited'],
        ];
    }
}
