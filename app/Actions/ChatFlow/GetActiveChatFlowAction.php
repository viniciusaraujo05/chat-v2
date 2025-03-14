<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;

class GetActiveChatFlowAction
{
    public function __invoke(): ?ChatFlow
    {
        return ChatFlow::where('is_active', true)
            ->orderBy('updated_at', 'desc')
            ->first();
    }
}