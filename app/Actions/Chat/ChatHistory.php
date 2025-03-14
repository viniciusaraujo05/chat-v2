<?php

namespace App\Actions\Chat;

use App\Models\Message;

class ChatHistory
{
    public function __invoke(string $conversationId)
    {
        $messages = Message::where('conversation_id', $conversationId)
            ->get();
        $userInfo = $messages->pluck('metadata.user_info')->first();

        return response()->json([
            'messages' => $messages,
            'user_info' => $userInfo
        ]);
    }
}
