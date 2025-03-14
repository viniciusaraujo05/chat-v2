<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Conversation extends Model
{
    use SoftDeletes;

    protected $table = 'conversations';

    protected $fillable = [
        'id',
        'client_name',
    ];

    protected $casts = [
        'id' => 'string',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
