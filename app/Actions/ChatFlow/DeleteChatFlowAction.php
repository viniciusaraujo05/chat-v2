<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DeleteChatFlowAction
{
    public function __invoke(string $id): void
    {
        $chatFlow = ChatFlow::findOrFail($id);

        if (!Auth::check()) {
            if ($chatFlow->user_id !== 1) {
                abort(403, 'Você não tem permissão para excluir este fluxo.');
            }
        } elseif ($chatFlow->user_id !== Auth::id()) {
            abort(403, 'Você não tem permissão para excluir este fluxo.');
        }

        try {
            $chatFlow->delete();
        } catch (\Exception $e) {
            Log::error('Erro ao excluir chat flow: ' . $e->getMessage());
            throw $e;
        }
    }
}