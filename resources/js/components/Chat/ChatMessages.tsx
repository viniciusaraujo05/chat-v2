import React, { memo, useEffect, useRef, useCallback, useMemo } from 'react';
import { Message } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import TypingIndicator from '@/components/Chat/TypingIndicator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  typingUsers?: { [key: string]: { name: string; isTyping: boolean; conversationId: string } };
  conversationId?: string;
  isDarkMode?: boolean;
}

const MessageSkeleton = memo(() => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="flex justify-start"
  >
    <div className="relative max-w-[70%] space-y-2">
      <Skeleton className="h-4 w-3/4 rounded-full" />
      <Skeleton className="h-4 w-1/2 rounded-full" />
      <Skeleton className="h-3 w-1/4 mt-2 rounded-full" />
    </div>
  </motion.div>
));
MessageSkeleton.displayName = 'MessageSkeleton';

const MessageBubble = memo(({ message, isFirstInGroup, isLastInGroup, isDarkMode }: {
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isDarkMode?: boolean;
}) => {
  const isAdmin = message.type === 'admin';
  const baseStyles = "relative max-w-[85%] sm:max-w-[70%] px-4 py-3 break-words transition-all duration-200 hover:shadow-md";
  const adminStyles = "bg-primary text-primary-foreground hover:bg-primary/90";
  const userStyles = "bg-background text-foreground border border-border hover:bg-muted/50";
  
  let borderRadius;
  if (isFirstInGroup && isLastInGroup) {
    borderRadius = "rounded-2xl";
  } else if (isFirstInGroup) {
    borderRadius = isAdmin 
      ? "rounded-t-2xl rounded-l-2xl rounded-br-lg" 
      : "rounded-t-2xl rounded-r-2xl rounded-bl-lg";
  } else if (isLastInGroup) {
    borderRadius = isAdmin 
      ? "rounded-b-2xl rounded-l-2xl rounded-tr-lg" 
      : "rounded-b-2xl rounded-r-2xl rounded-tl-lg";
  } else {
    borderRadius = isAdmin 
      ? "rounded-l-2xl rounded-r-lg" 
      : "rounded-r-2xl rounded-l-lg";
  }
  
  const bubbleClass = cn(baseStyles, isAdmin ? adminStyles : userStyles, borderRadius);

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} w-full group`}>
      <motion.div layout className={bubbleClass}>
        <p className="text-sm sm:text-base break-words leading-relaxed whitespace-pre-wrap">
          {message.text}
        </p>
        <span className={cn(
          "text-[10px] sm:text-xs block mt-1 opacity-75 group-hover:opacity-100 transition-opacity",
          isAdmin ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </motion.div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const ChatMessages = memo(({ messages, isLoading = false, typingUsers = {}, conversationId }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const activeTypingUsers = useMemo(() => 
    Object.values(typingUsers).filter(
      user => user.isTyping && user.conversationId === conversationId
    ), [typingUsers, conversationId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      scrollToBottom('auto');
      isInitialLoad.current = false;
    } else {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (activeTypingUsers.length > 0) {
      scrollToBottom();
    }
  }, [activeTypingUsers, scrollToBottom]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 gap-4 scroll-smooth flex flex-col-reverse scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
    >
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isFirstInGroup={index === 0 || messages[index - 1]?.type !== message.type}
              isLastInGroup={index === messages.length - 1 || messages[index + 1]?.type !== message.type}
              />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {activeTypingUsers.map(user => (
            <TypingIndicator key={user.name} user={user} />
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-0" />
      </div>

      {isLoading && messages.length === 0 && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <MessageSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
});
ChatMessages.displayName = 'ChatMessages';
export default ChatMessages;
