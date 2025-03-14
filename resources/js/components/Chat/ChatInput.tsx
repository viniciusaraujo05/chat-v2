import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { ChatInputProps } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChatInput = memo(({ onSendMessage, newMessage, handleInputChange, isLoading = false }: ChatInputProps) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const isEmpty = !newMessage.trim();

    // Manipulador de teclas para Enter/Shift+Enter
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage(e);
        }
    }, [onSendMessage]);

    // Ajusta a altura do textarea automaticamente
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [newMessage]);

    return (
        <div className="sticky bottom-0 border-t border-border/60 bg-card p-2 sm:p-4 backdrop-blur-lg">
            <form onSubmit={onSendMessage} className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 bg-background/80 p-2 rounded-lg border border-border transition-shadow focus-within:shadow-md">
                    <textarea
                        ref={textAreaRef}
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite sua mensagem..."
                        className={cn(
                          "flex-1 px-3 py-2 max-h-48 resize-none bg-transparent text-sm sm:text-base text-foreground placeholder-muted-foreground",
                          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md disabled:opacity-50 overflow-y-auto"
                        )}
                        disabled={isLoading}
                        aria-label="Message input"
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <Button
                        type="submit"
                        className="h-10 transition-all flex-shrink-0 text-sm sm:text-base"
                        disabled={isEmpty || isLoading}
                        aria-label="Send message"
                        variant="default"
                        size="default"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Enviando...
                            </span>
                        ) : (
                            'Enviar'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;