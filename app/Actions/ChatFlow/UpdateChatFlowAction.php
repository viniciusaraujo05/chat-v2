<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UpdateChatFlowAction
{
    public function __invoke(string $id, array $data): ChatFlow
    {
        $chatFlow = ChatFlow::findOrFail($id);

        if (!Auth::check()) {
            if ($chatFlow->user_id !== 1) {
                abort(403, 'Você não tem permissão para atualizar este fluxo.');
            }
        } elseif ($chatFlow->user_id !== Auth::id()) {
            abort(403, 'Você não tem permissão para atualizar este fluxo.');
        }

        try {
            $chatFlow->update(array_filter([
                'name' => $data['name'] ?? $chatFlow->name,
                'description' => $data['description'] ?? $chatFlow->description,
                'flow_data' => $data['flow_data'] ?? $chatFlow->flow_data,
                'settings' => $data['settings'] ?? $chatFlow->settings,
                'is_active' => $data['is_active'] ?? $chatFlow->is_active,
                'is_public' => $data['is_public'] ?? $chatFlow->is_public,
                'last_edited_at' => now(),
            ]));
            return $chatFlow->fresh();
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar chat flow: ' . $e->getMessage());
            throw $e;
        }
    }
}