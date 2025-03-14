<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class UserTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public $conversationId;
    public $isTyping;
    public $userInfo;

    /**
     * Create a new event instance.
     */
    public function __construct($conversationId, $isTyping, $userInfo)
    {
        $this->conversationId = $conversationId;
        $this->isTyping = $isTyping;
        $this->userInfo = $userInfo;
    }

    public function broadcastOn()
    {
        return new Channel('chat.' . $this->conversationId);
    }

    public function broadcastAs()
    {
        return 'UserTyping';
    }

    public function broadcastWith()
    {
        return [
            'isTyping' => $this->isTyping,
            'userInfo' => $this->userInfo
        ];
    }
}
