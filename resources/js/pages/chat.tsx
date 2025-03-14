import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import axios from 'axios';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import ChatMessages from '@/components/Chat/ChatMessages';
import ChatInput from '@/components/Chat/ChatInput';
import ConversationList from '@/components/Chat/ConversationList';
import ChatHeader from '@/components/Chat/ChatHeader';
import ChatHeaderMobile from '@/components/Chat/ChatHeaderMobile';
import ConversationData from '@/components/Chat/ConversationData';
import { Message, Conversation, TypingUser } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';
import '../echo';

const useWebSocket = (
  conversations: Conversation[],
  selectedConversation: string | null,
  setMessagesByConversation: React.Dispatch<React.SetStateAction<{ [key: string]: Message[] }>>,
  setTypingUsers: React.Dispatch<React.SetStateAction<{ [key: string]: TypingUser }>>,
  setUnreadMessages: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>,
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  setUserInfoCache: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>
) => {
  const subscriptionsRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    const currentSubscriptions = subscriptionsRef.current;
    const currentConversationIds = new Set(conversations.map(c => c.conversation_id));

    Object.keys(currentSubscriptions).forEach(conversationId => {
      if (!currentConversationIds.has(conversationId)) {
        const channel = currentSubscriptions[conversationId];
        console.log(`Unsubscribing from channel: ${channel.name}`);
        channel.stopListening('MessageCreated');
        channel.stopListening('.UserTyping');
        channel.stopListening('ChatDeleted');
        window.Echo.leave(channel.name);
        delete currentSubscriptions[conversationId];
      }
    });

    conversations.forEach(conversation => {
      const conversationId = conversation.conversation_id;
      if (!currentSubscriptions[conversationId]) {
        const channelName = `chat.${conversationId}`;
        console.log(`Subscribing to channel: ${channelName}`);
        const channel = window.Echo.channel(channelName)
          .listen('MessageCreated', (event: any) => {
            console.log('MessageCreated received:', event);
            if (event.message.type === 'client') {
              setUnreadMessages(prev => {
                const newUnread = {
                  ...prev,
                  [conversationId]: conversationId !== selectedConversation ? (prev[conversationId] || 0) + 1 : 0,
                };
                localStorage.setItem('unreadMessages', JSON.stringify(newUnread));
                return newUnread;
              });

              setMessagesByConversation(prev => {
                const currentMessages = prev[conversationId] || [];
                const messageExists = currentMessages.some(msg => msg.id === event.message.id);
                if (!messageExists) {
                  return {
                    ...prev,
                    [conversationId]: [...currentMessages, event.message],
                  };
                }
                return prev;
              });
            }

            // Atualizar userInfoCache com informações do usuário do evento
            if (event.message.user_info) {
              setUserInfoCache(prev => {
                const updatedCache = {
                  ...prev,
                  [conversationId]: event.message.user_info,
                };
                localStorage.setItem('userInfoCache', JSON.stringify(updatedCache));
                return updatedCache;
              });
            }
          })
          .listen('.UserTyping', (event: any) => {
            if (event.userInfo) {
              setTypingUsers(prev => ({
                ...prev,
                [event.userInfo.name]: {
                  name: event.userInfo.name,
                  isTyping: event.isTyping,
                  conversationId: conversationId,
                },
              }));
            }
          })
          .listen('ChatDeleted', (event: any) => {
            console.log('ChatDeleted received:', event);
            const deletedConversationId = event.conversationId;
            setConversations(prev => {
              const updated = prev.filter(conv => conv.conversation_id !== deletedConversationId);
              localStorage.setItem('chatConversations', JSON.stringify(updated));
              return updated;
            });
            setMessagesByConversation(prev => {
              const newMessages = { ...prev };
              delete newMessages[deletedConversationId];
              localStorage.setItem('chatMessages', JSON.stringify(newMessages));
              return newMessages;
            });
            setUnreadMessages(prev => {
              const newUnread = { ...prev };
              delete newUnread[deletedConversationId];
              localStorage.setItem('unreadMessages', JSON.stringify(newUnread));
              return newUnread;
            });
            setTypingUsers(prev => {
              const newTyping = { ...prev };
              Object.keys(newTyping).forEach(key => {
                if (newTyping[key].conversationId === deletedConversationId) {
                  delete newTyping[key];
                }
              });
              return newTyping;
            });
          });
        currentSubscriptions[conversationId] = channel;
      }
    });

    return () => {
      Object.values(currentSubscriptions).forEach(channel => {
        console.log(`Unsubscribing from channel: ${channel.name}`);
        channel.stopListening('MessageCreated');
        channel.stopListening('.UserTyping');
        channel.stopListening('ChatDeleted');
        window.Echo.leave(channel.name);
      });
      subscriptionsRef.current = {};
    };
  }, [conversations, selectedConversation, setMessagesByConversation, setTypingUsers, setUnreadMessages, setConversations, setUserInfoCache]);
};

const useChatData = (
  setMessagesByConversation: React.Dispatch<React.SetStateAction<{ [key: string]: Message[] }>>,
  selectedConversation: string | null,
  setSelectedConversation: React.Dispatch<React.SetStateAction<string | null>>
) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const cached = localStorage.getItem('chatConversations');
    return cached ? JSON.parse(cached) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateRef = useRef<{ [key: string]: number }>({});
  const pendingFetchRef = useRef<{ [key: string]: Promise<void> }>({});
  const [userInfoCache, setUserInfoCache] = useState<{ [key: string]: any }>(() => {
    return JSON.parse(localStorage.getItem('userInfoCache') || '{}');
  });

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/chat/conversations');
      console.log('Fetched conversations:', response.data);
      setConversations(response.data);
      localStorage.setItem('chatConversations', JSON.stringify(response.data));
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      setError('Falha ao carregar conversas. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (conversationId: string, force: boolean = false) => {
      if (!conversationId) return;

      const now = Date.now();
      const lastUpdate = lastUpdateRef.current[conversationId] || 0;
      // Usar um intervalo maior (5 minutos) já que o WebSocket cuida das atualizações em tempo real
      if (!force && now - lastUpdate < 300000) return;

      if (conversationId in pendingFetchRef.current) {
        await pendingFetchRef.current[conversationId];
        return;
      }

      setIsLoading(true);
      setError(null);
      pendingFetchRef.current[conversationId] = (async () => {
        try {
          const response = await axios.get(`/api/chat/history?conversation_id=${conversationId}`, {
            headers: { 'Cache-Control': 'no-cache' },
          });
          console.log(`Fetched messages for ${conversationId}:`, response.data);

          // Verificar se a conversa existe no banco de dados
          if (response.status === 404 || 
              (response.data?.messages && response.data.messages.length === 0) ||
              (Array.isArray(response.data) && response.data.length === 0)) {
            console.log(`A conversa ${conversationId} não existe mais no banco de dados. Removendo do cache...`);
            
            // Remover a conversa do cache
            setMessagesByConversation(prev => {
              const updated = { ...prev };
              delete updated[conversationId];
              localStorage.setItem('chatMessages', JSON.stringify(updated));
              return updated;
            });
            
            // Remover a conversa da lista de conversas
            setConversations(prev => {
              const updated = prev.filter(c => c.conversation_id !== conversationId);
              localStorage.setItem('chatConversations', JSON.stringify(updated));
              return updated;
            });
            
            // Se esta era a conversa selecionada, desselecionar
            if (selectedConversation === conversationId) {
              setSelectedConversation(null);
            }
            
            // Sair do processamento
            return;
          }

          let messages = [];
          if (response.data?.messages) {
            messages = response.data.messages[0]?.content || [];
          } else if (Array.isArray(response.data)) {
            messages = response.data;
          }

          const processedMessages = messages.map((msg: Message) => ({
            id: msg.id || `msg-${Date.now()}`,
            text: msg.text || msg.message || '',
            type: msg.type || 'admin',
            timestamp: msg.timestamp || new Date().toISOString(),
          }));

          setMessagesByConversation(prev => ({
            ...prev,
            [conversationId]: processedMessages,
          }));

          // Atualizar userInfoCache com informações do usuário
          if (response.data.user_info) {
            setUserInfoCache(prev => {
              const updatedCache = {
                ...prev,
                [conversationId]: response.data.user_info,
              };
              localStorage.setItem('userInfoCache', JSON.stringify(updatedCache));
              return updatedCache;
            });
          } else {
            // Se não houver user_info na resposta, buscar diretamente
            try {
              const userInfoResponse = await axios.get(`/api/chat/user-info?conversation_id=${conversationId}`);
              if (userInfoResponse.data) {
                setUserInfoCache(prev => {
                  const updatedCache = {
                    ...prev,
                    [conversationId]: userInfoResponse.data,
                  };
                  localStorage.setItem('userInfoCache', JSON.stringify(updatedCache));
                  return updatedCache;
                });
              }
            } catch (userInfoError) {
              console.error(`Erro ao buscar user_info para ${conversationId}:`, userInfoError);
            }
          }

          lastUpdateRef.current[conversationId] = now;
        } catch (error) {
          console.error(`Erro ao buscar mensagens para ${conversationId}:`, error);
          setError('Falha ao carregar mensagens. Tente novamente mais tarde.');
        } finally {
          delete pendingFetchRef.current[conversationId];
          setIsLoading(false);
        }
      })();

      await pendingFetchRef.current[conversationId];
    },
    [setMessagesByConversation]
  );

  useEffect(() => {
    fetchConversations();
    const channel = window.Echo.channel('conversations').listen('ConversationCreated', fetchConversations);
    
    // Verificar se as conversas em cache ainda existem no banco de dados
    const validateCachedConversations = async () => {
      const cachedConversations = JSON.parse(localStorage.getItem('chatConversations') || '[]');
      for (const conversation of cachedConversations) {
        try {
          const response = await axios.get(`/api/chat/history?conversation_id=${conversation.conversation_id}`, {
            headers: { 'Cache-Control': 'no-cache' },
          });
          
          // Se a conversa não existir mais no banco de dados, removê-la do cache
          if (response.status === 404 || 
              (response.data?.messages && response.data.messages.length === 0) ||
              (Array.isArray(response.data) && response.data.length === 0)) {
            console.log(`A conversa ${conversation.conversation_id} não existe mais no banco de dados. Removendo do cache...`);
            
            // Remover a conversa do cache de mensagens
            setMessagesByConversation(prev => {
              const updated = { ...prev };
              delete updated[conversation.conversation_id];
              localStorage.setItem('chatMessages', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (error) {
          console.error(`Erro ao verificar conversa ${conversation.conversation_id}:`, error);
        }
      }
    };
    
    validateCachedConversations();
    
    return () => {
      channel.stopListening('ConversationCreated');
      window.Echo.leave('conversations');
    };
  }, [fetchConversations]);

  return { conversations, setConversations, isLoading, error, fetchConversations, fetchMessages, userInfoCache, setUserInfoCache };
};

const Chat = memo(() => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<{ [key: string]: Message[] }>(() => {
    return JSON.parse(localStorage.getItem('chatMessages') || '{}');
  });
  const [newMessage, setNewMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: TypingUser }>({});
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>(() => {
    return JSON.parse(localStorage.getItem('unreadMessages') || '{}');
  });
  const [showConversationData, setShowConversationData] = useState(window.innerWidth >= 768);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedConversations, setLoadedConversations] = useState<Set<string>>(new Set());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { conversations, setConversations, isLoading, error: fetchError, fetchConversations, fetchMessages, userInfoCache, setUserInfoCache } = useChatData(setMessagesByConversation, selectedConversation, setSelectedConversation);

  useWebSocket(
    conversations,
    selectedConversation,
    setMessagesByConversation,
    setTypingUsers,
    setUnreadMessages,
    setConversations,
    setUserInfoCache
  );

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      const firstConversationId = conversations[0].conversation_id;
      setSelectedConversation(firstConversationId);
      // Verificar se já temos mensagens para esta conversa
      if (!messagesByConversation[firstConversationId] || messagesByConversation[firstConversationId].length === 0) {
        console.log(`Carregando mensagens para primeira conversa ${firstConversationId}`);
        fetchMessages(firstConversationId, true);
      }
      setLoadedConversations(prev => new Set(prev).add(firstConversationId));
    }
  }, [conversations, fetchMessages, selectedConversation, messagesByConversation]);

  useEffect(() => {
    localStorage.setItem('userInfoCache', JSON.stringify(userInfoCache));
    localStorage.setItem('chatMessages', JSON.stringify(messagesByConversation));
  }, [userInfoCache, messagesByConversation]);

  // Efeito para carregar mensagens de todas as conversas apenas uma vez quando a página carrega
  useEffect(() => {
    // Carregar mensagens apenas para conversas que ainda não têm mensagens carregadas
    const loadInitialMessages = () => {
      conversations.forEach(conversation => {
        const conversationId = conversation.conversation_id;
        // Verificar se já temos mensagens para esta conversa
        if (!messagesByConversation[conversationId] || messagesByConversation[conversationId].length === 0) {
          console.log(`Carregando mensagens iniciais para conversa ${conversationId}`);
          fetchMessages(conversationId, true);
        }
      });
    };

    // Carregar mensagens iniciais apenas uma vez
    loadInitialMessages();
    
    // Não precisamos de um intervalo, pois o WebSocket cuidará das atualizações em tempo real
  }, [conversations, fetchMessages, messagesByConversation]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setShowSidebar(isMobile ? false : true);
      setShowConversationData(isMobile ? false : true);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      // Verificar se já temos mensagens para esta conversa
      if (!messagesByConversation[selectedConversation] || messagesByConversation[selectedConversation].length === 0) {
        console.log(`Carregando mensagens para conversa selecionada ${selectedConversation}`);
        fetchMessages(selectedConversation, true);
      }
      setLoadedConversations(prev => new Set(prev).add(selectedConversation));
      
      // Marcar mensagens como lidas quando a conversa é selecionada
      if (unreadMessages[selectedConversation]) {
        setUnreadMessages(prev => {
          const newUnread = { ...prev };
          newUnread[selectedConversation] = 0;
          localStorage.setItem('unreadMessages', JSON.stringify(newUnread));
          return newUnread;
        });
      }
    }
    setSelectedUserInfo(userInfoCache[selectedConversation] || null);
  }, [selectedConversation, fetchMessages, userInfoCache, messagesByConversation, unreadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByConversation, selectedConversation]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: newMessage,
      type: 'admin',
      timestamp: new Date().toISOString(),
    };

    setMessagesByConversation(prev => {
      if (selectedConversation) {
        return {
          ...prev,
          [selectedConversation]: [...(prev[selectedConversation] || []), optimisticMessage],
        };
      }
      return prev;
    });
    setNewMessage('');

    try {
      const response = await axios.post('/api/chat/send-message', {
        message: newMessage,
        conversation_id: selectedConversation,
        sender: 'admin',
      });
      console.log('Message sent response:', response.data);

      if (response.data?.message?.id) {
        setMessagesByConversation(prev => {
          if (selectedConversation) {
            return {
              ...prev,
              [selectedConversation]: prev[selectedConversation].map(msg =>
                msg.id === optimisticMessage.id ? { ...msg, id: response.data.message.id } : msg
              ),
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessagesByConversation(prev => {
        if (selectedConversation) {
          return {
            ...prev,
            [selectedConversation]: prev[selectedConversation].filter(msg => msg.id !== optimisticMessage.id),
          };
        }
        return prev;
      });
      setNewMessage(optimisticMessage.text);
      setError('Falha ao enviar mensagem. Tente novamente.');
    }
  }, [newMessage, selectedConversation]);

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (!selectedConversation) return;

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    await axios.post(`/api/chat/typing`, {
      conversation_id: selectedConversation,
      isTyping: true,
      userInfo: { name: 'Admin' },
    });

    typingTimeout.current = setTimeout(async () => {
      await axios.post(`/api/chat/typing`, {
        conversation_id: selectedConversation,
        isTyping: false,
        userInfo: { name: 'Admin' },
      });
    }, 1000);
  }, [selectedConversation]);

  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversation(conversationId);
    setShowSidebar(window.innerWidth >= 768);
    setUnreadMessages(prev => {
      const newUnread = { ...prev, [conversationId]: 0 };
      localStorage.setItem('unreadMessages', JSON.stringify(newUnread));
      return newUnread;
    });
    setSelectedUserInfo(userInfoCache[conversationId] || null);
  }, [userInfoCache]);

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await axios.post(`/api/chat/delete?conversation_id=${conversationId}`);
        setConversations(prev => {
          const updated = prev.filter(conv => conv.conversation_id !== conversationId);
          localStorage.setItem('chatConversations', JSON.stringify(updated));
          return updated;
        });
        setMessagesByConversation(prev => {
          const newMessages = { ...prev };
          delete newMessages[conversationId];
          localStorage.setItem('chatMessages', JSON.stringify(newMessages));
          return newMessages;
        });
        setUnreadMessages(prev => {
          const newUnread = { ...prev };
          delete newUnread[conversationId];
          localStorage.setItem('unreadMessages', JSON.stringify(newUnread));
          return newUnread;
        });
        setTypingUsers(prev => {
          const newTyping = { ...prev };
          Object.keys(newTyping).forEach(key => {
            if (newTyping[key].conversationId === conversationId) {
              delete newTyping[key];
            }
          });
          return newTyping;
        });
        setUserInfoCache(prev => {
          const newCache = { ...prev };
          delete newCache[conversationId];
          localStorage.setItem('userInfoCache', JSON.stringify(newCache));
          return newCache;
        });
        setLoadedConversations(prev => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });

        if (selectedConversation === conversationId) {
          setSelectedConversation(null);
          setSelectedUserInfo(null);
        }
      } catch (error) {
        console.error('Erro ao deletar conversa:', error);
        setError('Falha ao deletar conversa. Tente novamente.');
      }
    },
    [conversations, messagesByConversation, unreadMessages, selectedConversation, setUserInfoCache]
  );

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Chat', href: '/chat' }
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Chat" />
      <Card className="h-[85vh] max-h-[700px] w-full max-w-7xl mx-auto border-primary/20 bg-gradient-to-br from-background to-background/90 overflow-hidden shadow-md flex flex-row p-0">
        <div
          className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 w-full sm:max-w-[260px] sm:min-w-[260px] border-r border-border/60 bg-card/90 backdrop-blur-md flex flex-col absolute sm:relative left-0 h-full transition-transform duration-300 ease-in-out z-10`}
        >
          <div className="h-12 p-2 border-b border-border/60 flex items-center justify-center">
            <Input
              type="text"
              placeholder="Buscar conversas..."
              className="w-full h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ConversationList
            conversations={conversations}
            searchTerm={searchTerm}
            selectedConversation={selectedConversation ?? 'defaultConversationId'}
            handleConversationSelect={handleConversationSelect}
            typingUsers={typingUsers}
            messagesByConversation={messagesByConversation}
            unreadMessages={unreadMessages}
          />
        </div>

        <div className="flex-1 flex flex-col transition-all duration-300">
          {(error || fetchError) && <div className="text-red-500 p-2">{error || fetchError}</div>}
          {selectedConversation ? (
            <>
              <ChatHeaderMobile
                title={conversations.find(c => c.conversation_id === selectedConversation)?.name || ''}
                onToggleSidebar={() => setShowSidebar(!showSidebar)}
                onToggleConversationData={() => setShowConversationData(!showConversationData)}
                setShowSidebar={setShowSidebar}
              />
              <ChatHeader
                title={conversations.find(c => c.conversation_id === selectedConversation)?.name || ''}
                onToggleConversationData={() => setShowConversationData(!showConversationData)}
              />
              <div className="flex-1 bg-background/95 backdrop-blur-sm overflow-y-auto flex flex-col-reverse">
                <div ref={messagesEndRef} />
                {isLoading && <div className="text-center p-4">Carregando mensagens...</div>}
                <ChatMessages
                  messages={messagesByConversation[selectedConversation] || []}
                  isLoading={isLoading}
                  typingUsers={typingUsers}
                  conversationId={selectedConversation}
                />
              </div>
              <ChatInput
                onSendMessage={handleSendMessage}
                newMessage={newMessage}
                handleInputChange={handleInputChange}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground bg-background/95 backdrop-blur-sm">
              <svg
                className="w-12 h-12 mb-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
              <p className="text-lg font-semibold text-foreground">Selecione uma conversa</p>
              <p className="text-sm mt-2 max-w-xs text-muted-foreground">
                Escolha uma conversa existente ou inicie uma nova
              </p>
            </div>
          )}
        </div>

        {selectedConversation && (
          <div
            className={`w-64 max-w-[260px] min-w-[260px] border-l border-border/60 bg-card/90 backdrop-blur-md shadow-md transition-transform duration-300 ease-in-out z-20 ${
              window.innerWidth >= 768
                ? `flex-shrink-0 ${showConversationData ? '' : 'hidden'}`
                : `absolute right-0 top-0 h-full ${showConversationData ? 'translate-x-0' : 'translate-x-full'}`
            }`}
          >
            <ConversationData
              isOpen={showConversationData}
              setIsOpen={setShowConversationData}
              faqs={[]}
              userInfo={userInfoCache[selectedConversation]}
              conversationId={selectedConversation}
              onDelete={() => handleDeleteConversation(selectedConversation)}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
            />
          </div>
        )}
      </Card>
      <Toaster />
    </AppLayout>
  );
});

export default Chat;