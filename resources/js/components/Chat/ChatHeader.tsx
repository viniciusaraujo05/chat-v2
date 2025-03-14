import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChatHeader = memo(({ title, onToggleConversationData }: { title: string; onToggleConversationData: () => void; }) => (
    <div className="hidden sm:flex items-center justify-between p-3 bg-card border-b border-border/60">
        <h3 className="ml-2 font-medium truncate text-foreground">
            {title}
        </h3>
        <Button
            onClick={() => onToggleConversationData()}
            variant="ghost"
            size="icon"
            aria-label="Toggle conversation details"
            title="Show more conversation data"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="sr-only">Expand conversation details</span>
        </Button>
    </div>
));

export default ChatHeader;
ChatHeader.displayName = 'ChatHeader'; 