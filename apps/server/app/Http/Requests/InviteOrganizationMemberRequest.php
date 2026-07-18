<?php

declare(strict_types=1);

namespace FangaBase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class InviteOrganizationMemberRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'role' => ['required', 'string', Rule::in(['ADMIN', 'MEMBER'])],
            'organization_id' => ['prohibited'],
        ];
    }
}
