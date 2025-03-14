export interface Conversation {
    conversation_id: string;
    name: string;
}

export interface ChatState {
    searchTerm: string;
    selectedConversation: string | null;
    conversations: Conversation[];
    messagesByConversation: { [key: string]: Message[] };
    newMessage: string;
    showSidebar: boolean;
    isLoading: boolean;
    typingUsers: { [key: string]: TypingUser };
    unreadMessages: { [key: string]: number };
    showConversationData: boolean;
    selectedUserInfo: UserInfo | null;
    userInfoCache: { [key: string]: UserInfo };
}

export interface Message {
    id: string;
    text: string;
    type: 'admin' | 'client';
    timestamp: string;
    message?: string;
}

export interface TypingUser {
    name: string;
    isTyping: boolean;
    conversationId: string;
}

export interface UnreadMessages {
    [key: string]: number;
}

export interface MessagesByConversation {
    [key: string]: Message[];
}

export interface ChatInputProps {
    onSendMessage: (e: React.FormEvent) => Promise<void>;
    newMessage: string;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    isLoading?: boolean;
}

export interface UserInfo {
    id: string;
    name: string;
    avatar?: string;
    lastActive: Date;
    email?: string;
    status?: 'online' | 'offline' | 'away';
}
