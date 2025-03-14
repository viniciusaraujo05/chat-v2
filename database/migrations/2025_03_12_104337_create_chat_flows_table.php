<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chat_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('flow_data'); // Armazena os nós e conexões do fluxo
            $table->json('settings')->nullable(); // Configurações adicionais do fluxo
            $table->integer('is_active')->default(1); // 0 = false, 1 = true
            $table->integer('is_public')->default(0); // 0 = false, 1 = true
            $table->timestamp('last_edited_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_flows');
    }
};
