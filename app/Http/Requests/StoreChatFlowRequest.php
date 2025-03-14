<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreChatFlowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Autorização pode ser movida para um middleware se necessário
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'flow_data' => ['required', 'json'],
            'settings' => ['nullable', 'json'],
            'is_public' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome é obrigatório.',
            'flow_data.required' => 'Os dados do fluxo são obrigatórios.',
            'flow_data.json' => 'Os dados do fluxo devem ser um JSON válido.',
        ];
    }
}