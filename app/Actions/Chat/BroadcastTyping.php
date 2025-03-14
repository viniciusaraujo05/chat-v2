<?php

namespace App\Actions\Chat;

use App\Events\UserTyping;

class BroadcastTyping
{
    /**
     * Broadcast typing status.
     *
     * @param array $data
     * @return \Illuminate\Http\JsonResponse
     */
    public function __invoke(array $data)
    {
        broadcast(new UserTyping(
            $data['conversation_id'],
            $data['isTyping'],
            $data['user_info'] ?? null
        ))->toOthers();

        return response()->json(['status' => 'ok']);
    }
}
