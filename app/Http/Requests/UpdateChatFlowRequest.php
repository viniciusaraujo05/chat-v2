<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateChatFlowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'flow_data' => ['sometimes', 'required', 'json'],
            'settings' => ['nullable', 'json'],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
        ];
    }
}