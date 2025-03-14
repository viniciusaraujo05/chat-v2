<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class ChatFlow extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'flow_data',
        'settings',
        'is_active',
        'is_public',
        'last_edited_at',
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'flow_data' => 'array',
        'settings' => 'array',
        'is_active' => 'integer', // Alterado para integer
        'is_public' => 'integer', // Alterado para integer
        'last_edited_at' => 'datetime',
    ];
    
    /**
     * Sobrescrever o método de atribuição para is_public para garantir que seja sempre um inteiro
     */
    public function setIsPublicAttribute($value)
    {
        // Converter para inteiro (0 = false, 1 = true)
        $this->attributes['is_public'] = $value === true || $value === 'true' || $value === 1 || $value === '1' ? 1 : 0;
    }
    
    /**
     * Sobrescrever o método de atribuição para is_active para garantir que seja sempre um inteiro
     */
    public function setIsActiveAttribute($value)
    {
        // Converter para inteiro (0 = false, 1 = true)
        $this->attributes['is_active'] = $value === true || $value === 'true' || $value === 1 || $value === '1' ? 1 : 0;
    }

    /**
     * Obter o usuário que possui este fluxo de chat.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Obter a configuração onde este fluxo é definido como inicial.
     */
    public function asStartFlow(): HasOne
    {
        return $this->hasOne(ChatFlowConfig::class, 'start_flow');
    }
}
