import React, { memo, useMemo } from 'react';
import { Message, Conversation } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ConversationListProps {
    conversations: Conversation[];
    searchTerm: string;
    selectedConversation: string;
    typingUsers?: { [key: string]: { name: string; isTyping: boolean; conversationId: string } };
    messagesByConversation: { [key: string]: Message[] };
    unreadMessages: { [key: string]: number };
    handleConversationSelect: (conversationId: string) => void;
}

const ConversationAvatar = memo(({ name, isSelected }: { name: string; isSelected: boolean }) => (
    <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        aria-label={`Avatar for ${name}`}
        className="flex-shrink-0"
    >
        <Avatar className={cn(
            "w-12 h-12",
            isSelected ? "border-2 border-primary" : "border-2 border-muted"
        )}>
            <AvatarFallback className={cn(
                isSelected ? "bg-primary/10 text-primary" : "bg-muted/20 text-foreground"
            )}>
                {name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    </motion.div>
));

ConversationAvatar.displayName = 'ConversationAvatar';

const LastMessage = memo(({ message, isTyping }: { message: string; isTyping: boolean }) => (
    <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
            "text-sm truncate max-w-full",
            isTyping ? "text-primary font-medium animate-pulse" : "text-muted-foreground"
        )}
    >
        {message}
    </motion.p>
));

LastMessage.displayName = 'LastMessage';

const UnreadBadge = memo(({ count }: { count: number }) => (
    <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute right-4 top-1/2 -translate-y-1/2 animate-bounce"
        aria-label={`${count} unread messages`}
    >
        <Badge variant="destructive" className="min-w-[20px] h-5 text-xs font-bold px-1.5">
            {count}
        </Badge>
    </motion.div>
));

UnreadBadge.displayName = 'UnreadBadge';

const ConversationItem = memo(({
    conversation,
    isSelected,
    lastMessage,
    isTyping,
    unreadCount,
    onClick
}: {
    conversation: Conversation;
    isSelected: boolean;
    lastMessage: string;
    isTyping: boolean;
    unreadCount: number;
    onClick: () => void;
}) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        role="button"
        tabIndex={0}
        className={cn(
            "flex items-center px-4 py-3 cursor-pointer",
            "transition-all duration-300 relative rounded-lg mx-1",
            "border-b border-border/40",
            "hover:bg-accent/40 active:bg-accent/60",
            isSelected ? "bg-accent/80 hover:bg-accent/80 shadow-md border-transparent" : "bg-transparent"
        )}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
        <ConversationAvatar name={conversation.name} isSelected={isSelected} />

        <div className="ml-4 flex-1 min-w-0 flex flex-col justify-center relative">
            <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                    "text-base font-medium truncate",
                    isSelected ? "text-primary" : "text-foreground"
                )}
            >
                {conversation.name}
            </motion.h3>
            <LastMessage message={lastMessage} isTyping={isTyping} />
        </div>

        {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
    </motion.div>
));

ConversationItem.displayName = 'ConversationItem';

const ConversationList = memo(({
    conversations,
    searchTerm,
    selectedConversation,
    typingUsers,
    messagesByConversation,
    unreadMessages,
    handleConversationSelect,
}: ConversationListProps) => {
    const filteredAndSortedConversations = useMemo(() => {
        const filtered = conversations.filter(conv =>
            conv.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const aMessages = messagesByConversation[a.conversation_id] || [];
            const bMessages = messagesByConversation[b.conversation_id] || [];

            const aLastMessage = aMessages[aMessages.length - 1];
            const bLastMessage = bMessages[bMessages.length - 1];

            if (!aLastMessage && !bLastMessage) return 0;
            if (!aLastMessage) return 1;
            if (!bLastMessage) return -1;

            return new Date(bLastMessage.timestamp).getTime() - new Date(aLastMessage.timestamp).getTime();
        });
    }, [conversations, searchTerm, messagesByConversation]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-2 overflow-y-auto flex-1 px-2 py-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            layout
        >
            <AnimatePresence>
                {filteredAndSortedConversations.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground"
                    >
                        <svg
                            className="w-12 h-12 mb-2 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <p className="text-sm font-medium text-foreground">Nenhuma conversa encontrada</p>
                        <p className="text-xs mt-1 text-muted-foreground">Tente uma busca diferente</p>
                    </motion.div>
                ) : (
                    filteredAndSortedConversations.map((conversation) => {
                        const isTyping = Object.values(typingUsers || {}).some(
                            (user) =>
                                user.conversationId === conversation.conversation_id && user.isTyping
                        );
                        const messages = messagesByConversation[conversation.conversation_id] || [];
                        const lastMessage = isTyping
                            ? 'Digitando...'
                            : messages.length > 0
                                ? messages[messages.length - 1].text
                                : 'Nenhuma mensagem';

                        return (
                            <motion.div
                                key={conversation.conversation_id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ConversationItem
                                    conversation={conversation}
                                    isSelected={selectedConversation === conversation.conversation_id}
                                    lastMessage={lastMessage}
                                    isTyping={isTyping}
                                    unreadCount={unreadMessages[conversation.conversation_id] || 0}
                                    onClick={() => handleConversationSelect(conversation.conversation_id)}
                                />
                            </motion.div>
                        );
                    })
                )}
            </AnimatePresence>
        </motion.div>
    );
});

ConversationList.displayName = 'ConversationList';
export default ConversationList;