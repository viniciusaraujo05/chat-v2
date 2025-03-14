<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatFlowConfig extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'is_active',
        'start_flow',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'start_flow' => 'integer',
    ];

    /**
     * Get the start flow associated with the config.
     */
    public function startFlow(): BelongsTo
    {
        return $this->belongsTo(ChatFlow::class, 'start_flow');
    }
}
