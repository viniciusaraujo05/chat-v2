<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ChatFlowResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'description' => $this->description,
            'flow_data' => $this->flow_data,
            'settings' => $this->settings,
            'is_public' => $this->is_public,
            'is_active' => $this->is_active,
            'last_edited_at' => $this->last_edited_at->toDateTimeString(),
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }

    public function with($request): array
    {
        return [
            'success' => true,
        ];
    }
}