<?php

declare(strict_types=1);

namespace FangaBase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AdminOrganizationUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['ACTIVE', 'SUSPENDED'])],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
