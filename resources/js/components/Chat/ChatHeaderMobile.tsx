import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChatHeaderMobile = memo(({ title, onToggleConversationData, setShowSidebar }: { title: string; onToggleSidebar: () => void; onToggleConversationData: () => void; setShowSidebar: (show: boolean) => void }) => (
    <div className="sm:hidden flex items-center justify-between p-3 bg-card border-b border-border/60 gap-2">
        <Button
            onClick={() => setShowSidebar(true)}
            variant="ghost"
            size="icon"
            className="p-2"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        </Button>
        <h3 className="ml-2 font-medium truncate text-foreground">
            {title}
        </h3>
        <Button
            onClick={() => onToggleConversationData()}
            variant="ghost"
            size="icon"
            className="p-2"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </Button>
    </div>
));

export default ChatHeaderMobile;
ChatHeaderMobile.displayName = 'ChatHeaderMobile';