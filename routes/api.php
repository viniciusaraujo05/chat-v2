<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Chat\ChatController;
use App\Http\Controllers\Api\Chat\FAQController;
use App\Http\Controllers\Api\ChatFlowController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::group(['prefix' => 'chat'], function () {
    Route::post('/send-message', [ChatController::class, 'sendMessage'])->name('send-message');
    Route::get('/history', [ChatController::class, 'getHistory'])->name('history');
    Route::get('/conversations', [ChatController::class, 'conversations'])->name('conversations');
    Route::post('/typing', [ChatController::class, 'broadcastTyping'])->name('typing');
    Route::post('/delete', [ChatController::class, 'deleteChat'])->name('delete');

    Route::get('/faqs', [FAQController::class, 'index'])->name('faqs');
    Route::get('/faqs/{id}', [FAQController::class, 'show'])->name('faq.show');
    Route::post('/faqs', [FAQController::class, 'store'])->name('faq.store');
    Route::put('/faqs/{id}', [FAQController::class, 'update'])->name('faq.update');
    Route::delete('/faqs/{id}', [FAQController::class, 'destroy'])->name('faq.destroy');
});


Route::get('/start-flow', [ChatFlowController::class, 'getStartFlow'])->name('chat-flows.start-flow');

Route::group(['prefix' => 'chat-flows', 'middleware' => 'auth:sanctum'], function () {
    Route::get('/', [ChatFlowController::class, 'index'])->name('chat-flows.index');
    Route::post('/', [ChatFlowController::class, 'store'])->name('chat-flows.store');
    Route::get('/active', [ChatFlowController::class, 'getActive'])->name('chat-flows.active');
    Route::get('/{id}', [ChatFlowController::class, 'show'])->name('chat-flows.show');
    Route::put('/{id}', [ChatFlowController::class, 'update'])->name('chat-flows.update');
    Route::delete('/{id}', [ChatFlowController::class, 'destroy'])->name('chat-flows.destroy');
});

Route::group(['prefix' => 'chat-flow-config', 'middleware' => 'auth:sanctum'],  function () {
    Route::get('/', [\App\Http\Controllers\ChatFlowConfigController::class, 'index'])->name('chat-flow-config.index');
    Route::put('/', [\App\Http\Controllers\ChatFlowConfigController::class, 'update'])->name('chat-flow-config.update');
    Route::get('/available-flows', [\App\Http\Controllers\ChatFlowConfigController::class, 'availableFlows'])->name('chat-flow-config.available-flows');
    Route::post('/toggle', [\App\Http\Controllers\ChatFlowConfigController::class, 'toggle'])->name('chat-flow-config.toggle');
});
