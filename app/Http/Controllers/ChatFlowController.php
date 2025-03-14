<?php

namespace App\Http\Controllers;

use App\Models\ChatFlow;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ChatFlowController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        if (Auth::check()) {
            $chatFlows = ChatFlow::where('user_id', Auth::id())
                ->orderBy('updated_at', 'desc')
                ->get();
        } else {
            $chatFlows = ChatFlow::where('user_id', 1)
                ->orWhere('is_public', true)
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => $chatFlows
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'flow_data' => 'required|json',
            'settings' => 'nullable|json',
            'is_public' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Criar um novo fluxo de chat com cast explícito para boolean no PostgreSQL
        $userId = Auth::id() ?? 1; // Usar ID 1 como fallback quando não há autenticação
        $isPublic = false; // Valor padrão
        
        // Inserir diretamente usando query builder com valores inteiros para campos booleanos
        $id = DB::table('chat_flows')->insertGetId([
            'user_id' => $userId,
            'name' => $request->name,
            'description' => $request->description,
            'flow_data' => $request->flow_data, // Já é JSON
            'settings' => $request->has('settings') ? $request->settings : null,
            'is_public' => 0, // 0 = false, 1 = true
            'is_active' => 1, // 0 = false, 1 = true
            'last_edited_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Buscar o fluxo recém-criado
        $chatFlow = ChatFlow::find($id);

        return response()->json([
            'success' => true,
            'message' => 'Fluxo de chat criado com sucesso!',
            'data' => $chatFlow
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $chatFlow = ChatFlow::findOrFail($id);

        // Verificar se o usuário tem permissão para visualizar este fluxo
        // Se não estiver autenticado, permitir visualizar fluxos públicos ou do usuário 1
        if (!Auth::check()) {
            if (!$chatFlow->is_public && $chatFlow->user_id !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Você não tem permissão para visualizar este fluxo.'
                ], 403);
            }
        } else if ($chatFlow->user_id !== Auth::id() && !$chatFlow->is_public) {
            return response()->json([
                'success' => false,
                'message' => 'Você não tem permissão para visualizar este fluxo.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $chatFlow
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $chatFlow = ChatFlow::findOrFail($id);

        // Verificar se o usuário tem permissão para atualizar este fluxo
        // Se não estiver autenticado, permitir atualizar fluxos do usuário 1
        if (!Auth::check()) {
            if ($chatFlow->user_id !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Você não tem permissão para atualizar este fluxo.'
                ], 403);
            }
        } else if ($chatFlow->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Você não tem permissão para atualizar este fluxo.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'flow_data' => 'sometimes|required|json',
            'settings' => 'nullable|json',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('name')) {
            $chatFlow->name = $request->name;
        }
        
        if ($request->has('description')) {
            $chatFlow->description = $request->description;
        }
        
        if ($request->has('flow_data')) {
            $chatFlow->flow_data = json_decode($request->flow_data, true);
        }
        
        if ($request->has('settings')) {
            $chatFlow->settings = json_decode($request->settings, true);
        }
        
        if ($request->has('is_active')) {
            $chatFlow->is_active = $request->is_active;
        }
        
        if ($request->has('is_public')) {
            // Converter explicitamente para boolean usando cast para PostgreSQL
            $isPublic = $request->is_public === true || $request->is_public === 'true' || $request->is_public === 1 || $request->is_public === '1';
            $chatFlow->is_public = $isPublic;
        }
        
        $chatFlow->last_edited_at = now();
        $chatFlow->save();

        return response()->json([
            'success' => true,
            'message' => 'Fluxo de chat atualizado com sucesso!',
            'data' => $chatFlow
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $chatFlow = ChatFlow::findOrFail($id);

        // Verificar se o usuário tem permissão para excluir este fluxo
        // Se não estiver autenticado, permitir excluir fluxos do usuário 1
        if (!Auth::check()) {
            if ($chatFlow->user_id !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Você não tem permissão para excluir este fluxo.'
                ], 403);
            }
        } else if ($chatFlow->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Você não tem permissão para excluir este fluxo.'
            ], 403);
        }

        $chatFlow->delete();

        return response()->json([
            'success' => true,
            'message' => 'Fluxo de chat excluído com sucesso!'
        ]);
    }
    
    /**
     * Retorna o fluxo de chat ativo para o widget
     */
    public function getActive(): JsonResponse
    {
        // Buscar o fluxo de chat ativo mais recente
        $chatFlow = ChatFlow::where('is_active', 1)
            ->orderBy('updated_at', 'desc')
            ->first();
            
        if (!$chatFlow) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhum fluxo de chat ativo encontrado.'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $chatFlow
        ]);
    }
}
