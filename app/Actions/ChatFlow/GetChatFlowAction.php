<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;
use Illuminate\Support\Facades\Auth;

class GetChatFlowAction
{
    public function __invoke(string $id): ChatFlow
    {
        $chatFlow = ChatFlow::findOrFail($id);

        if (!Auth::check()) {
            if (!$chatFlow->is_public && $chatFlow->user_id !== 1) {
                abort(403, 'Você não tem permissão para visualizar este fluxo.');
            }
        } elseif ($chatFlow->user_id !== Auth::id() && !$chatFlow->is_public) {
            abort(403, 'Você não tem permissão para visualizar este fluxo.');
        }

        return $chatFlow;
    }
}