<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->jsonb('content');
            $table->string('conversation_id');
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->foreign('conversation_id')
                  ->references('id')
                  ->on('conversations')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
