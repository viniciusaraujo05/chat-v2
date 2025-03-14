<?php

namespace App\Actions\Chat;

use App\Events\MessageCreated;
use App\Events\ConversationCreated;
use App\Models\Message;
use App\Models\Conversation;

class SendMessage
{
    public function __invoke(array $data, string $ip, string $userAgent)
    {
        $messageContent = $this->createMessageContent($data);
        broadcast(new MessageCreated($messageContent, $data['conversation_id']))->toOthers();

        $conversation = $this->getOrCreateConversation($data);

        $message = $this->createOrUpdateMessage($conversation, $messageContent, $data, $ip, $userAgent);

        return response()->json([
            'status' => 'success',
            'message' => $messageContent,
            'conversation_id' => $message->conversation_id
        ]);
    }

    private function createMessageContent(array $data): array
    {
        return [
            'text' => $data['message'],
            'type' => $data['sender'] === 'admin' ? 'admin' : 'client',
            'timestamp' => now()->toIso8601String(),
            'id' => uniqid(),
        ];
    }

    private function getOrCreateConversation(array $data)
    {
        $conversation = Conversation::where('id', $data['conversation_id'])->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'id' => $data['conversation_id'],
                'client_name' => $data['user_info']['name'] ?? 'Anonymous',
            ]);
            broadcast(new ConversationCreated());
        }

        return $conversation;
    }

    private function createOrUpdateMessage($conversation, array $messageContent, array $data, string $ip, string $userAgent)
    {
        $message = Message::where('conversation_id', $data['conversation_id'])->first();

        if (!$message) {
            return Message::create([
                'conversation_id' => $conversation->id,
                'content' => [$messageContent],
                'metadata' => [
                    'sender_ip' => $ip,
                    'user_agent' => $userAgent,
                    'user_info' => $data['user_info']
                ],
            ]);
        }

        $message->update([
            'content' => array_merge($message->content, [$messageContent]),
            'updated_at' => now(),
        ]);

        return $message;
    }
}
