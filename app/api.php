<?php

use App\Http\Controllers\Api\Chat\ChatController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::group(['prefix' => 'chat'], function () {
    Route::post('/send-message', [ChatController::class, 'sendMessage'])->name('send-message');
    Route::get('/history', [ChatController::class, 'getHistory'])->name('history');
    Route::get('/conversations', [ChatController::class, 'conversations'])->name('conversations');
    Route::post('/typing', [ChatController::class, 'broadcastTyping'])->name('typing');
    Route::post('/delete', [ChatController::class, 'deleteChat'])->name('delete');
});
