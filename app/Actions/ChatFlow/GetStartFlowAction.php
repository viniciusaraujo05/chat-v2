<?php

namespace App\Actions\ChatFlow;

use App\Models\ChatFlow;
use App\Models\ChatFlowConfig;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class GetStartFlowAction
{
    public function __invoke(): ?ChatFlow
    {
        // Obtener la configuración actual
        $config = ChatFlowConfig::first();
        
        // Si no hay configuración o no está activada, devolver null
        if (!$config || !$config->is_active) {
            Log::info('Chat Flow no disponible: Configuración no existe o no está activa');
            return null;
        }
        
        // Si hay un flujo inicial configurado, buscarlo
        if ($config->start_flow) {
            try {
                // Usamos findOrFail y catch para asegurar que devolvemos un solo modelo o null
                $flow = ChatFlow::findOrFail($config->start_flow);
                
                // Asegurar que el flujo esté activo
                if (!$flow->is_active) {
                    Log::warning('El flujo inicial encontrado no está activo', ['id' => $flow->id]);
                    return null;
                }
                
                Log::info('Flujo inicial encontrado', ['id' => $flow->id, 'name' => $flow->name]);
                return $flow; // Devuelve un ChatFlow model
            } catch (ModelNotFoundException $e) {
                Log::warning('Flujo inicial configurado no encontrado', ['start_flow' => $config->start_flow]);
                return null;
            }
        } else {
            Log::info('No hay flujo inicial configurado');
            return null;
        }
    }
}
