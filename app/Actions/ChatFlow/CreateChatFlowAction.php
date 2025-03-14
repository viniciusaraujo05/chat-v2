<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CreateChatFlowAction
{
    public function __invoke(array $data): ChatFlow
    {
        try {
            $userId = Auth::id() ?? 1;
            $chatFlow = ChatFlow::create([
                'user_id' => $userId,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'flow_data' => $data['flow_data'],
                'settings' => $data['settings'] ?? null,
                'is_public' => $data['is_public'] ?? false,
                'is_active' => true,
                'last_edited_at' => now(),
            ]);
            return $chatFlow;
        } catch (\Exception $e) {
            Log::error('Erro ao criar chat flow: ' . $e->getMessage());
            throw $e;
        }
    }
}