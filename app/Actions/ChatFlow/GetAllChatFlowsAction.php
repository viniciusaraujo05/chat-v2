<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;
use Illuminate\Support\Facades\Auth;

class GetAllChatFlowsAction
{
    public function __invoke(): \Illuminate\Database\Eloquent\Collection
    {
        if (Auth::check()) {
            return ChatFlow::where('user_id', Auth::id())
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        return ChatFlow::where('is_public', true)
            ->orderBy('updated_at', 'desc')
            ->get();
    }
}