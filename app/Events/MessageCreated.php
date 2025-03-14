<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class MessageCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public $message;

    public $conversationId;

    public function __construct($message, $conversationId)
    {
        $this->message = [
            'id' => $message['id'] ?? uniqid(),
            'text' => $message['text'],
            'type' => $message['type'] ?? 'admin',
            'timestamp' => $message['timestamp'] ?? now()->toIso8601String(),
        ];

        $this->conversationId = $conversationId;
    }

    public function broadcastOn()
    {
        return new Channel('chat.'.$this->conversationId);
    }
}
