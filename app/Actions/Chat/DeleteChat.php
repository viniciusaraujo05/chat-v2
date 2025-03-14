<?php

namespace App\Actions\Chat;

use App\Models\Message;
use App\Models\Conversation;
use App\Events\ChatDeleted;

class DeleteChat
{
    public function __invoke(string $conversationId)
    {
        Message::where('conversation_id', $conversationId)->delete();
        Conversation::where('id', $conversationId)->delete();

        broadcast(new ChatDeleted($conversationId));

        return response()->json([
            'status' => 'success',
            'message' => 'Chat deleted successfully'
        ]);
    }
}