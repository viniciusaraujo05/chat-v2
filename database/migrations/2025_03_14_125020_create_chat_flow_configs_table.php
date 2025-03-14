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
        Schema::create('chat_flow_configs', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_active')->default(false);
            $table->foreignId('start_flow')->nullable()->constrained('chat_flows')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_flow_configs');
    }
};
