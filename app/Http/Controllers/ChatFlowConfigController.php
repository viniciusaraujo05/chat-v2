<?php

namespace App\Http\Controllers;

use App\Models\ChatFlow;
use App\Models\ChatFlowConfig;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ChatFlowConfigController extends Controller
{
    /**
     * Obter a configuração atual do Chat Flow.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            // Obter a primeira configuração ou criar uma nova se não existir
            $config = ChatFlowConfig::with('startFlow')->first() ?? new ChatFlowConfig();
            
            return response()->json([
                'success' => true,
                'data' => $config
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter configurações: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar a configuração do Chat Flow.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        try {
            // Validar os dados da requisição
            $validator = Validator::make($request->all(), [
                'is_active' => 'required|boolean',
                'start_flow' => 'nullable|exists:chat_flows,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Obter a configuração atual ou criar uma nova
            $config = ChatFlowConfig::first();
            
            if (!$config) {
                $config = new ChatFlowConfig();
            }

            // Usar insert ou update direto para garantir tipo correto no PostgreSQL
            if ($config->exists) {
                // Atualizar registro existente com valor explicitamente tipado
                DB::table('chat_flow_configs')
                    ->where('id', $config->id)
                    ->update([
                        'is_active' => DB::raw($request->is_active ? 'TRUE' : 'FALSE'),
                        'start_flow' => $request->start_flow,
                        'updated_at' => now()
                    ]);
                
                // Recarregar o modelo
                $config->refresh();
            } else {
                // Criar novo registro com cast explícito para boolean
                $id = DB::table('chat_flow_configs')
                    ->insertGetId([
                        'is_active' => DB::raw($request->is_active ? 'TRUE' : 'FALSE'),
                        'start_flow' => $request->start_flow,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                
                $config = ChatFlowConfig::find($id);
            }
            
            // Registrar debug
            Log::debug('Atualizando ChatFlowConfig', [
                'id' => $config->id,
                'is_active' => $config->is_active,
                'is_active_type' => gettype($config->is_active),
                'start_flow' => $config->start_flow
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Configurações atualizadas com sucesso',
                'data' => $config->load('startFlow')
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar configurações: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter todos os fluxos disponíveis para seleção como fluxo inicial.
     *
     * @return JsonResponse
     */
    public function availableFlows(): JsonResponse
    {
        try {
            $flows = ChatFlow::select('id', 'name', 'description')
                ->where('is_active', 1)
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $flows
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter fluxos disponíveis: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Alternar rapidamente o status de ativação do Chat Flow.
     *
     * @return JsonResponse
     */
    public function toggle(): JsonResponse
    {
        try {
            $config = ChatFlowConfig::first();
            
            if (!$config) {
                $config = new ChatFlowConfig();
            }

            // Inverter o status atual
            $config->is_active = !$config->is_active;
            $config->save();

            return response()->json([
                'success' => true,
                'message' => $config->is_active ? 'Chat Flow ativado com sucesso' : 'Chat Flow desativado com sucesso',
                'data' => [
                    'is_active' => $config->is_active
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao alternar status: ' . $e->getMessage()
            ], 500);
        }
    }
}
