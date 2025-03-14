<?php

namespace App\Http\Controllers\Api\Chat;

use App\Actions\Chat\BroadcastTyping;
use App\Actions\Chat\ChatHistory;
use App\Actions\Chat\Conversations;
use App\Actions\Chat\DeleteChat;
use App\Actions\Chat\SendMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    /**
     * Send a message.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendMessage(SendMessage $sendMessage, SendMessageRequest $request)
    {
        return $sendMessage(
            $request->all(),
            $request->ip(),
            $request->userAgent()
        );
    }

    /**
     * Summary of getHistory
     *
     * @return mixed|\Illuminate\Http\JsonResponse
     */
    public function getHistory(Request $request, ChatHistory $history)
    {
        return $history($request->input('conversation_id'));
    }

    /**
     * Summary of deleteChat
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteChat(Request $request, DeleteChat $deleteChat)
    {
        return $deleteChat($request->input('conversation_id'));
    }

    /**
     * Summary of conversations
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function conversations(Conversations $conversations)
    {
        return $conversations();
    }

    /**
     * Broadcast typing status.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function broadcastTyping(Request $request, BroadcastTyping $broadcastTyping)
    {
        return $broadcastTyping($request->all());
    }
}
