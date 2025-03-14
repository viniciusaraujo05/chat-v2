import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const TypingIndicator = memo(({ user }: { user: { name: string } }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-start my-2 animate-fade-in"
    >
        <div className="bg-background rounded-lg border border-border/60 px-4 py-2 flex items-center space-x-2">
            <span className="text-sm text-muted-foreground font-medium">{user.name}</span>
            <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
        </div>
    </motion.div>
));

TypingIndicator.displayName = 'TypingIndicator';
export default TypingIndicator;