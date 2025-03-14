<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class ChatDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversationId;

    public function __construct($conversationId)
    {
        $this->conversationId = $conversationId;
    }

    public function broadcastOn()
    {
        return new Channel('chat.'.$this->conversationId);
    }

    public function broadcastAs()
    {
        return 'ChatDeleted';
    }
}
