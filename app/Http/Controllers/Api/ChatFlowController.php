<?php

namespace App\Http\Controllers\Api;

use App\Actions\ChatFlow\CreateChatFlowAction;
use App\Actions\ChatFlow\DeleteChatFlowAction;
use App\Actions\ChatFlow\GetActiveChatFlowAction;
use App\Actions\ChatFlow\GetAllChatFlowsAction;
use App\Actions\ChatFlow\GetChatFlowAction;
use App\Actions\ChatFlow\GetStartFlowAction;
use App\Actions\ChatFlow\UpdateChatFlowAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreChatFlowRequest;
use App\Http\Requests\UpdateChatFlowRequest;
use App\Http\Resources\ChatFlowResource;
use Illuminate\Http\JsonResponse;

class ChatFlowController extends Controller
{
    public function index(GetAllChatFlowsAction $action): JsonResponse
    {
        $chatFlows = $action();

        return ChatFlowResource::collection($chatFlows)
            ->response()
            ->setStatusCode(200);
    }

    public function store(StoreChatFlowRequest $request, CreateChatFlowAction $action): JsonResponse
    {
        $chatFlow = $action($request->validated());

        return (new ChatFlowResource($chatFlow))
            ->response()
            ->setStatusCode(201);
    }

    public function show(string $id, GetChatFlowAction $action): JsonResponse
    {
        $chatFlow = $action($id);

        return (new ChatFlowResource($chatFlow))
            ->response()
            ->setStatusCode(200);
    }

    public function update(UpdateChatFlowRequest $request, string $id, UpdateChatFlowAction $action): JsonResponse
    {
        $chatFlow = $action($id, $request->validated());

        return (new ChatFlowResource($chatFlow))
            ->response()
            ->setStatusCode(200);
    }

    public function destroy(string $id, DeleteChatFlowAction $action): JsonResponse
    {
        $action($id);

        return response()->json([
            'success' => true,
            'message' => 'Fluxo de chat excluído com sucesso!',
        ], 204);
    }

    public function getActive(GetActiveChatFlowAction $action): JsonResponse
    {
        $chatFlow = $action();

        return $chatFlow
            ? (new ChatFlowResource($chatFlow))->response()->setStatusCode(200)
            : response()->json(['success' => false, 'message' => 'Nenhum fluxo de chat ativo encontrado.'], 404);
    }
    
    public function getStartFlow(GetStartFlowAction $action): JsonResponse
    {
        $chatFlow = $action();

        return $chatFlow
            ? response()->json([
                'success' => true,
                'data' => new ChatFlowResource($chatFlow)
              ], 200)
            : response()->json([
                'success' => false, 
                'message' => 'Nenhum fluxo de chat inicial configurado ou o chat está desativado.'
              ], 404);
    }
}
