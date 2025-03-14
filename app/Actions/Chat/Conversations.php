<?php
namespace App\Actions\Chat;

use App\Models\Conversation;

class Conversations
{
    public function __invoke()
    {
        return response()->json(
            Conversation::all()->map(fn ($conversation) => [
                'conversation_id' => $conversation->id,
                'name' => $conversation->client_name ?? 'Anonymous',
            ])->unique()
        );
    }
}