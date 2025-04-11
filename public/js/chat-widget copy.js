(() => {
    // Configurações constantes
    const CONSTANTS = {
        CHAT_SERVER: window.location.origin,
        WS_SERVER: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}:8080/app/7vrgi25mdfojb94mbz3v`,
        TAILWIND_CSS: 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
        DEFAULT_CONFIG: {
            position: 'right',
            title: 'Chat de Suporte',
            bubbleColor: '#4F46E5',
            welcomeMessage: 'Olá {name}! Como posso ajudar você hoje?',
            cacheTTL: 24 * 60 * 60 * 1000,
        },
    };

    const Utils = {
        createElement(tag, classes = '', attributes = {}) {
            const element = document.createElement(tag);
            element.className = classes;
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            return element;
        },

        generateId() {
            return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        },

        getConversationId() {
            return localStorage.getItem('chat_conversation_id') || this.setConversationId(this.generateId());
        },

        setConversationId(id) {
            localStorage.setItem('chat_conversation_id', id);
            return id;
        },

        setCache(key, value, ttl = CONSTANTS.DEFAULT_CONFIG.cacheTTL) {
            const item = { value, expiry: Date.now() + ttl };
            localStorage.setItem(key, JSON.stringify(item));
        },

        getCache(key) {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            const item = JSON.parse(itemStr);
            if (Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            return item.value;
        },
        
        clearCache(key) {
            localStorage.removeItem(key);
        },

        debounce(fn, delay) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn(...args), delay);
            };
        },

        replacePlaceholders(template, data) {
            return template.replace(/{(\w+)}/g, (_, key) => data[key] || '');
        },
    };

    // Configuração do chat
    const Config = {
        get() {
            return { ...CONSTANTS.DEFAULT_CONFIG, ...(window.chatConfig || {}) };
        },
    };

    // Cliente API
    const ApiClient = {
        async postMessage(message, sender = 'client', userInfo, conversationId) {
            const response = await fetch(`${CONSTANTS.CHAT_SERVER}/api/chat/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    conversation_id: conversationId || Utils.getConversationId(),
                    sender,
                    user_info: userInfo,
                }),
            });
            if (!response.ok) throw new Error('Network response failed');
            const data = await response.json();
            return { ...data, id: data.message?.id || Utils.generateId() };
        },

        async broadcastTyping(isTyping, userInfo) {
            await fetch(`${CONSTANTS.CHAT_SERVER}/api/chat/typing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: Utils.getConversationId(),
                    isTyping,
                    user_info: userInfo,
                }),
            });
        },

        async getHistory(conversationId) {
            const cacheKey = `chat_history_${conversationId || Utils.getConversationId()}`;
            const cached = Utils.getCache(cacheKey);
            if (cached && cached.length > 0) return cached;

            const response = await fetch(
                `${CONSTANTS.CHAT_SERVER}/api/chat/history?conversation_id=${conversationId || Utils.getConversationId()}`
            );
            if (response.status === 404) {
                Utils.setCache(cacheKey, []);
                return [];
            }
            const data = await response.json();
            const messages = data.messages?.[0]?.content || [];
            const uniqueMessages = this.removeWelcomeDuplicates(messages);
            Utils.setCache(cacheKey, uniqueMessages);
            return uniqueMessages;
        },

        async checkConversationExists(conversationId) {
            try {
                const response = await fetch(
                    `${CONSTANTS.CHAT_SERVER}/api/chat/history?conversation_id=${conversationId || Utils.getConversationId()}`
                );
                
                // Se o status for 200 e temos conteúdo, a conversa existe
                if (response.status === 200) {
                    const data = await response.json();
                    // Verificar se há mensagens na conversa
                    return data && data.messages && data.messages.length > 0;
                }
                
                return false;
            } catch (error) {
                console.error('Erro ao verificar existência da conversa:', error);
                return false;
            }
        },

        removeWelcomeDuplicates(messages) {
            const seenWelcome = new Set();
            return messages.reduce((acc, msg) => {
                const welcomeText = Config.get().welcomeMessage.replace(/{(\w+)}/g, '');
                if (msg.type === 'admin' && msg.text === welcomeText) {
                    if (!seenWelcome.has(msg.text)) {
                        seenWelcome.add(msg.text);
                        acc.push(msg);
                    }
                } else {
                    acc.push(msg);
                }
                return acc;
            }, []);
        },

        async getChatFlow() {
            try {
                // Busca o fluxo de chat inicial conforme configuração
                const response = await fetch(`${CONSTANTS.CHAT_SERVER}/api/start-flow`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        console.info('Nenhum fluxo inicial configurado ou chat desativado');
                    } else {
                        console.error('Erro ao buscar fluxo de chat:', response.status);
                    }
                    return null;
                }
                
                const data = await response.json();
                
                if (data.success && data.data) {
                    console.info('Fluxo de chat inicial carregado:', data.data.name);
                    return data.data;
                } else {
                    console.info('Nenhum fluxo de chat disponível');
                    return null;
                }
            } catch (error) {
                console.error('Erro ao buscar fluxo de chat:', error);
                return null;
            }
        },
    };

    // WebSocket Manager
    class WebSocketManager {
        constructor(chat) {
            this.chat = chat;
            this.socket = null;
            this.isSubscribed = false;
            this.pingInterval = null;
            this.isReady = false;
            this.messageQueue = [];
            this.connect();
        }

        connect() {
            // Limpar conexão antiga se existir
            if (this.socket) {
                try {
                    this.socket.close();
                } catch (e) {
                    console.log('Erro ao fechar socket antigo:', e);
                }
                this.socket = null;
                this.isSubscribed = false;
                
                // Limpar intervalo de ping anterior
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
            }

            console.log('Iniciando nova conexão WebSocket...');
            this.socket = new WebSocket(CONSTANTS.WS_SERVER);
            
            this.socket.onopen = () => {
                console.log('WebSocket conectado com sucesso!');
                this.subscribeToChannel();
                
                // Definir um timeout para garantir que estamos prontos para usar
                setTimeout(() => {
                    this.isReady = true;
                    console.log('WebSocket está pronto para enviar/receber mensagens');
                    
                    // Processar qualquer mensagem na fila
                    if (this.messageQueue.length > 0) {
                        console.log(`Processando ${this.messageQueue.length} mensagens em fila`);
                        this.messageQueue.forEach(msg => {
                            this.socket.send(JSON.stringify(msg));
                        });
                        this.messageQueue = [];
                    }
                }, 1000); // 1 segundo para garantir que a assinatura foi processada
            };
            
            this.socket.onmessage = (event) => {
                console.log('Mensagem recebida:', event.data.substring(0, 100));
                this.handleMessage(event.data);
            };
            
            this.socket.onclose = (event) => {
                console.log(`WebSocket fechado. Código: ${event.code}. Razão: ${event.reason}`);
                this.isSubscribed = false;
                this.isReady = false;
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
                // Reconectar com backoff exponencial
                setTimeout(() => this.connect(), 2000);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket erro:', error);
                this.isReady = false;
            };
        }
        
        startPingInterval() {
            // Limpar intervalo existente se houver
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
            }
            
            // Enviar ping a cada 30 segundos para manter a conexão viva
            this.pingInterval = setInterval(() => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        event: 'pusher:ping',
                        data: {}
                    }));
                    console.log('Ping enviado para manter conexão');
                } else {
                    console.log('Socket não está aberto, não pode enviar ping');
                    this.connect(); // Tentar reconectar
                }
            }, 30000); // 30 segundos
        }

        subscribeToChannel() {
            // Limpar estado anterior, mesmo se já inscrito
            this.isSubscribed = false;
            
            const conversationId = Utils.getConversationId();
            console.log('Subscribing to channel:', `chat.${conversationId}`);
            
            // Verificar se o socket está aberto antes de enviar
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    event: 'pusher:subscribe',
                    data: { channel: `chat.${conversationId}` },
                }));
                
                console.log('Subscription request sent');
                this.isSubscribed = true;
                
                // Enviar ping para manter a conexão ativa
                this.startPingInterval();
            } else {
                console.error('WebSocket not open, cannot subscribe');
                setTimeout(() => this.connect(), 500);
                return;
            }
            
            // Verificar periodicamente se a inscrição está ativa
            setTimeout(() => {
                if (this.socket.readyState === WebSocket.OPEN) {
                    console.log('WebSocket connection is open, subscription should be active');
                    
                    // Enviar novamente a inscrição para garantir
                    this.socket.send(JSON.stringify({
                        event: 'pusher:subscribe',
                        data: { channel: `chat.${conversationId}` },
                    }));
                } else {
                    console.error('WebSocket connection is not open, reconnecting...');
                    this.connect();
                }
            }, 1000);
        }

        handleMessage(data) {
            console.log('WebSocket message received:', data);
            try {
                const parsed = JSON.parse(data);
                
                // Log para depuração
                if (parsed.event) {
                    console.log('Event type:', parsed.event);
                }

                if (parsed.event === 'App\\Events\\MessageCreated') {
                    try {
                        const { message } = JSON.parse(parsed.data);
                        console.log('Parsed message:', message);
                        
                        // Normalizar os campos da mensagem
                        const messageId = message.id || Utils.generateId();
                        const messageText = message.message || message.text || '';
                        const messageType = message.sender_type || message.type || (message.sender_id === 1 ? 'admin' : 'client');
                        
                        console.log('Mensagem normalizada - ID:', messageId, 'Tipo:', messageType, 'Texto:', messageText);
                        
                        // VERIFICAÇÃO GLOBAL: Nunca processe a mesma mensagem duas vezes (qualquer tipo)
                        if (this.chat._messageTracker && this.chat._messageTracker.processed.has(messageId)) {
                            console.log('Mensagem já processada anteriormente (ID):', messageId);
                            return;
                        }
                        
                        // Para mensagens do admin, processamento simplificado e prioritário para garantir entrega
                        if (messageType === 'admin') {
                            console.log('Processando mensagem do admin via WebSocket:', messageId);
                            
                            // Verificar apenas se já existe um elemento DOM com este ID
                            const existingElement = this.chat.messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
                            if (existingElement) {
                                console.log('Elemento da mensagem do admin já existe no DOM, ignorando:', messageId);
                                return;
                            }
                            
                            // Verificar se já existe mensagem idêntica recente (5 segundos)
                            const now = new Date().getTime();
                            const existingAdminMsg = Array.from(this.chat.messages?.values() || []).find(m => {
                                // Verificar apenas por texto e tipo idênticos e timestamp recente
                                if (m.type !== 'admin' || m.text !== messageText) return false;
                                
                                // Converter timestamp para comparação temporal
                                const msgTime = new Date(m.timestamp).getTime();
                                const timeDiff = Math.abs(now - msgTime);
                                return timeDiff < 5000; // 5 segundos de diferença
                            });
                            
                            if (existingAdminMsg) {
                                console.log('Mensagem do admin similar já existe, ignorando:', messageId);
                                return;
                            }
                            
                            // Criar uma versão normalizada da mensagem com ID único garantido
                            const normalizedMessage = {
                                ...message,
                                id: messageId,
                                type: messageType,
                                text: messageText,
                                timestamp: message.timestamp || message.created_at || new Date().toISOString(),
                                fromWebSocket: true, // Marcar que veio do WebSocket
                                priority: true       // Marcar como prioritária para processamento
                            };
                            
                            console.log('Adicionando mensagem prioritária do admin via WebSocket:', normalizedMessage);
                            
                            // Forçar exibição imediata com uma prioridade mais alta
                            // Usar um try-catch para garantir que o processamento continue mesmo com erros
                            try {
                                // Adicionar diretamente ao DOM para garantir exibição instantânea
                                this.chat.addMessage(normalizedMessage, true);
                                
                                // Notificar usuário se o chat não estiver aberto
                                if (!this.chat.isOpen) {
                                    this.chat.incrementNotification();
                                }
                                
                                // Atualizar cache de mensagens
                                this.updateCache(normalizedMessage);
                                
                                // Forçar scroll para o final após adicionar a mensagem
                                setTimeout(() => this.chat.scrollToBottom(), 50);
                            } catch (e) {
                                console.error('Erro ao adicionar mensagem do admin:', e);
                                
                                // Tentar novamente com um delay maior em caso de erro
                                setTimeout(() => {
                                    try {
                                        this.chat.addMessage(normalizedMessage, true);
                                        this.updateCache(normalizedMessage);
                                    } catch (e2) {
                                        console.error('Falha persistente ao adicionar mensagem do admin:', e2);
                                    }
                                }, 500);
                            }
                            return;
                        }
                        
                        // Para mensagens do cliente via WebSocket
                        if (messageType === 'client') {
                            // Marcar como permanente TODA mensagem do cliente recebida via WebSocket
                            // Isso garantirá que a primeira mensagem nunca seja removida
                            const permanentMsg = {
                                ...message,
                                id: messageId,
                                text: messageText,
                                type: messageType,
                                permanent: true,
                                preserve: true,
                                clientOriginal: true,
                                // Verificar se é a primeira mensagem do cliente
                                isFirstMessage: this.chat.messages && this.chat.messages.size === 0
                            };
                            
                            // Se for admin, garantir que a mensagem seja preservada e nunca removida
                            if (window.location.pathname.includes('/admin')) {
                                console.log('⚡️ ADMIN: Recebendo mensagem do cliente via WebSocket - Garantindo preservação:', messageId);
                            }
                            
                            // PARTE CRUCIAL: NUNCA processar mensagens do cliente que vieram de volta pelo websocket
                            // pois já temos a versão original no DOM/mapa de mensagens
                            
                            // Inicializar o rastreador se não existir
                            if (!this.chat._messageTracker) {
                                this.chat._messageTracker = {
                                    sent: new Map(),
                                    processed: new Set()
                                };
                            }
                            
                            // Registrar esta mensagem como processada para evitar duplicação
                            this.chat._messageTracker.processed.add(messageId);
                            
                            // IMPORTANTE: Verificar se é a primeira mensagem do cliente no lado admin
                            // O lado admin é o problema principal com a primeira mensagem desaparecendo
                            const isFirstMessageInAdmin = window.location.pathname.includes('/admin') && 
                                (!this.chat.messages || this.chat.messages.size === 0 || 
                                !Array.from(this.chat.messages.values()).some(m => m.type === 'client'));
                            
                            if (isFirstMessageInAdmin) {
                                console.log('⚡️ IMPORTANTE: Primeira mensagem do cliente no admin detectada! Preservando...');
                                
                                // Criar mensagem com todas as flags de preservação possíveis
                                const firstClientMsg = {
                                    id: messageId,
                                    type: 'client',
                                    sender_type: 'client',
                                    text: messageText,
                                    message: messageText,
                                    timestamp: new Date().toISOString(),
                                    // FLAGS CRUCIAIS para garantir preservação
                                    permanent: true,
                                    preserve: true,
                                    clientOriginal: true,
                                    isFirstMessage: true,
                                    fromWebSocket: true,
                                    // Marcadores visuais para debugging
                                    _special: 'primeira_mensagem_cliente'
                                };
                                
                                // Forçar a adição direta ao DOM com máxima prioridade
                                console.log('⚡️ ADMIN: Adicionando primeira mensagem do cliente diretamente:', firstClientMsg);
                                this.chat.addMessage(firstClientMsg, true);
                                
                                // Garantir que a mensagem seja registrada como processada
                                if (this.chat._messageTracker) {
                                    this.chat._messageTracker.processed.add(messageId);
                                }
                                return; // Interromper processamento normal
                            }
                            
                            // Verificar se já temos qualquer mensagem com texto idêntico
                            const existingClientMsg = Array.from(this.chat.messages.values()).find(m => 
                                (m.text === messageText || m.message === messageText) && 
                                m.type === 'client'
                            );
                            
                            if (existingClientMsg) {
                                console.log('Mensagem do cliente já existe localmente, IGNORANDO o echo do websocket:', messageText);
                                // Verificar se a mensagem existente tem a flag 'permanent'
                                if (existingClientMsg.permanent) {
                                    // Atualizar mensagem existente com ID do servidor sem removê-la
                                    const preservedMsg = {
                                        ...existingClientMsg,
                                        id: messageId, // Usar o ID do servidor
                                        fromServer: true,
                                        // Manter flags de preservação
                                        permanent: true,
                                        preserve: true,
                                        clientOriginal: true
                                    };
                                    
                                    // Atualizar elementos DOM com o novo ID sem remover
                                    const msgElement = this.chat.messagesContainer.querySelector(`[data-message-id="${existingClientMsg.id}"]`);
                                    if (msgElement) {
                                        msgElement.setAttribute('data-message-id', messageId);
                                        msgElement.setAttribute('data-preserved', 'true');
                                    }
                                    
                                    // Atualizar no mapa de mensagens
                                    this.chat.messages.delete(existingClientMsg.id);
                                    this.chat.messages.set(messageId, preservedMsg);
                                }
                                return;
                            }
                            
                            // Verificar se já existe essa mensagem com o mesmo ID
                            if (this.chat.messages.has(messageId)) {
                                console.log('Mensagem do cliente já existe no mapa com mesmo ID, ignorando:', messageId);
                                return;
                            }
                            
                            // Verificamos se o texto é idêntico a qualquer mensagem recentemente enviada
                            const sentMessages = this.sentMessages || new Set();
                            if (sentMessages.has(messageText)) {
                                console.log('Mensagem igual foi enviada recentemente, ignorando duplicação via websocket:', messageText);
                                return;
                            }
                            
                            // Mensagem nova (não duplicada) - Proceder com processamento extremamente cuidadoso
                            console.log('NOVA mensagem do cliente recebida pelo WebSocket:', messageText);
                            
                            // Crie uma versão normalizada da mensagem mas com marcadores de segurança
                            const normalizedMessage = {
                                ...message,
                                id: messageId,
                                type: messageType,
                                text: messageText,
                                timestamp: message.timestamp || message.created_at || new Date().toISOString(),
                                fromWebSocket: true,
                                // Marcadores de segurança
                                wsMessage: true,
                                alreadyProcessed: true // Evitar processamento adicional
                            };
                            
                            // Apenas adicionar se for realmente uma nova mensagem válida
                            this.chat.addMessage(normalizedMessage, true);
                            this.updateCache(normalizedMessage);
                        }
                    } catch (parseError) {
                        console.error('Erro ao processar dados da mensagem:', parseError);
                    }
                } else if (parsed.event === 'App\\Events\\UserTyping' || parsed.event === 'UserTyping') {
                    console.log('Typing event received:', parsed.data);
                    try {
                        const typingData = JSON.parse(parsed.data);
                        const isTyping = typingData.isTyping;
                        const userInfo = typingData.userInfo;
                        
                        // Mostrar indicador de digitação apenas se for do admin (sem userInfo)
                        if (!userInfo) {
                            console.log('Admin is typing:', isTyping);
                            this.chat.showTyping(isTyping);
                        }
                    } catch (typingError) {
                        console.error('Error parsing typing event data:', typingError);
                    }
                } else if (parsed.event === 'ChatDeleted') {
                    const { conversationId } = JSON.parse(parsed.data);
                    if (conversationId === Utils.getConversationId()) this.chat.endChat();
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        }

        updateCache(message) {
            const cacheKey = `chat_history_${Utils.getConversationId()}`;
            const cached = Utils.getCache(cacheKey) || [];
            const updated = [...cached, message];
            Utils.setCache(cacheKey, updated);
        }
    }

    // Classe principal do Chat
    class Chat {
        constructor(root) {
            this.root = root;
            this.config = Config.get();
            this.isOpen = false;
            this.userInfo = Utils.getCache('chat_user_info');
            this.messages = new Map();
            this.ws = null;
            this.typingTimeout = null;
            this.typingIndicator = null;
            this.unreadCount = 0;
            this.notificationBadge = null;
            this.isInitialized = Utils.getCache('chat_initialized') === true;
            this.chatUIRendered = false;
            // Propriedades para o fluxo de chat
            this.chatFlow = null;
            this.currentNode = null;
            this.flowHistory = [];
            this.inFlowMode = false;
            this.init();
        }

        async init() {
            this.loadStyles();
            this.renderButton();
            
            // Verificar e limpar qualquer conexão WebSocket existente
            if (this.ws) {
                console.log('Closing existing WebSocket connection');
                this.ws.socket?.close();
                this.ws = null;
            }
            
            // Se já temos uma conversa iniciada, verificar se ela ainda existe no banco de dados
            if (this.isInitialized && Utils.getConversationId()) {
                console.log('Verificando se a conversa ainda existe no banco de dados...');
                const conversationExists = await ApiClient.checkConversationExists(Utils.getConversationId());
                
                if (!conversationExists) {
                    console.log('A conversa não existe mais no banco de dados. Reiniciando o chat...');
                    this.resetChat();
                    return; // Interrompe a inicialização atual
                }
            }
            
            // Tenta carregar o fluxo de chat antes de renderizar a interface
            try {
                console.log('Buscando fluxo de chat...');
                this.chatFlow = await ApiClient.getChatFlow();
                console.log('Resposta do servidor:', this.chatFlow);
                
                if (this.chatFlow && this.chatFlow.flow_data) {
                    console.log('Processando flow_data...');
                    try {
                        const flowData = typeof this.chatFlow.flow_data === 'string' 
                            ? JSON.parse(this.chatFlow.flow_data) 
                            : this.chatFlow.flow_data;
                        
                        this.chatFlow.nodes = flowData.nodes || [];
                        this.chatFlow.edges = flowData.edges || [];
                        this.chatFlow.positions = flowData.positions || {};
                        console.log('Fluxo de chat processado:', {
                            nodes: this.chatFlow.nodes.length,
                            edges: this.chatFlow.edges.length,
                            firstNode: this.chatFlow.nodes[0]
                        });
                    } catch (parseError) {
                        console.error('Erro ao fazer parse do flow_data:', parseError);
                    }
                }
            } catch (error) {
                console.error('Erro ao processar fluxo de chat:', error);
                this.chatFlow = null;
            }
            
            // Definir o estado inicial do modo de fluxo
            this.inFlowMode = false;
            
            // Renderiza a interface após carregar o fluxo
            this.renderChat();
            
            // Inicializar WebSocket após renderizar o chat
            console.log('Initializing WebSocket connection');
            this.ws = new WebSocketManager(this);
            
            // Garantir que o WebSocket esteja pronto antes de continuar
            let wsCheckAttempts = 0;
            const checkWebSocketReady = () => {
                if (this.ws && this.ws.socket && this.ws.socket.readyState === WebSocket.OPEN) {
                    console.log('WebSocket inicializado e conectado com sucesso!');
                    // Forçar a marcação como pronto após conexão
                    setTimeout(() => {
                        this.ws.isReady = true;
                        console.log('WebSocket marcado como pronto após inicialização');
                    }, 500);
                } else if (wsCheckAttempts < 5) {
                    wsCheckAttempts++;
                    console.log(`Tentativa ${wsCheckAttempts} de verificar WebSocket, aguardando...`);
                    setTimeout(checkWebSocketReady, 1000);
                } else {
                    console.warn('WebSocket não conectou após múltiplas tentativas');
                }
            };
            
            // Iniciar verificação após um pequeno delay
            setTimeout(checkWebSocketReady, 500);
            
            if (this.isInitialized && this.userInfo) {
                await this.restoreChat();
            }
        }

        loadStyles() {
            if (!this.root.querySelector('#chat-styles')) {
                const link = Utils.createElement('link', '', {
                    id: 'chat-styles',
                    rel: 'stylesheet',
                    href: CONSTANTS.TAILWIND_CSS,
                });
                const style = Utils.createElement('style');
                style.textContent = `
                    .chat-container { 
                        transition: all 0.3s ease-in-out; 
                        overscroll-behavior: contain;
                        -webkit-overflow-scrolling: touch;
                        position: fixed !important;
                        z-index: 2147483647 !important;
                    }
                    .chat-container::-webkit-scrollbar { width: 6px; }
                    .chat-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
                    .chat-container::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }
                    .chat-container::-webkit-scrollbar-thumb:hover { background: #555; }
                    .typing-animation { display: inline-flex; gap: 4px; }
                    .typing-animation .dot { width: 8px; height: 8px; background-color: ${this.config.bubbleColor}; border-radius: 50%; animation: blink 1.4s infinite both; }
                    .typing-animation .dot:nth-child(2) { animation-delay: 0.2s; }
                    .typing-animation .dot:nth-child(3) { animation-delay: 0.4s; }
                    @keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
                    .rounded-2xl:hover { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
                    .chat-bubble-client { background: ${this.config.bubbleColor} !important; color: white !important; }
                    .chat-bubble-admin { background: #f3f4f6 !important; color: #333 !important; }
                    #chat-button-container { 
                        position: fixed !important; 
                        z-index: 2147483647 !important; 
                    }
                    @media (max-width: 768px) {
                        .chat-bubble-client, .chat-bubble-admin { max-width: 85%; font-size: 14px; }
                        .chat-container { border-radius: 1rem; }
                    }
                `;
                this.root.appendChild(link);
                this.root.appendChild(style);
            }
        }

        renderButton() {
            const position = this.config.position === 'left' ? 'left-4' : 'right-4';
            
            // Criar um container para o botão flutuante
            const buttonContainer = Utils.createElement(
                'div',
                `fixed bottom-6 ${position}`,
                { 
                    id: 'chat-button-container',
                    style: 'z-index: 99999999 !important; position: fixed !important;'
                }
            );
            
            // Criar o botão com estilo shadcn UI
            this.button = Utils.createElement(
                'button',
                `w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out opacity-100`,
                { 
                    'aria-label': 'Abrir chat de suporte',
                    'data-state': 'closed',
                    'style': `background-color: ${this.config.bubbleColor}; color: white; z-index: 99999999 !important;`
                }
            );
            
            // Adicionar ícone moderno de chat
            this.button.innerHTML = `
                <div class="relative overflow-hidden rounded-full w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </div>
            `;
            
            // Adicionar evento de clique
            this.button.onclick = () => this.toggle();
            
            // Adicionar o botão ao container e o container ao root
            buttonContainer.appendChild(this.button);
            this.root.appendChild(buttonContainer);
        }

        renderChat() {
            const isMobile = window.innerWidth < 768;
            const width = isMobile ? '95vw' : '360px';
            const height = isMobile ? '85vh' : '550px';
            const position = this.config.position === 'left' ? 'left-2 sm:left-4' : 'right-2 sm:right-4';

            this.container = Utils.createElement(
                'div',
                `fixed bottom-20 ${position} chat-container bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden ${this.isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`,
                {
                    style: `width: ${width}; height: ${height}; z-index: 2147483647 !important; max-width: 100vw; ${isMobile ? 'margin: 0 0.5rem' : ''}; position: fixed !important;`
                }
            );

            this.renderHeader();
            
            // Limpar qualquer estado anterior
            this.chatUIRendered = false;
            
            // Decide qual interface renderizar com base no estado do chat e fluxo
            if (this.userInfo && this.isInitialized) {
                this.renderChatUI();
            } else if (this.chatFlow && this.chatFlow.nodes && this.chatFlow.nodes.length > 0 && !this.inFlowMode) {
                // Se temos um fluxo de chat e não estamos em modo de fluxo, inicie o fluxo
                this.startChatFlow();
            } else {
                this.renderUserForm();
            }
            
            this.root.appendChild(this.container);

            window.addEventListener('resize', Utils.debounce(() => this.adjustForMobile(), 200));
        }

        adjustForMobile() {
            const isMobile = window.innerWidth < 768;
            const width = isMobile ? '95vw' : '360px';
            const height = isMobile ? '85vh' : '550px';
            this.container.style.width = width;
            this.container.style.height = height;
            this.container.style.margin = isMobile ? '0 0.5rem' : '0';
        }

        renderHeader() {
            const header = Utils.createElement(
                'div',
                'p-4 text-white flex justify-between items-center rounded-t-2xl shadow-md',
                { style: `background: linear-gradient(135deg, ${this.config.bubbleColor} 0%, #6D28D9 100%);` }
            );
            header.innerHTML = `<h2 class="text-xl font-bold">${this.config.title}</h2>`;
            const closeBtn = Utils.createElement('button', 'text-white hover:opacity-80 transition', { 'aria-label': 'Fechar' });
            closeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
            closeBtn.onclick = () => this.toggle();
            header.appendChild(closeBtn);
            this.container.appendChild(header);
        }
        
        // SOLUÇÃO DEFINITIVA: Método para restaurar mensagens do localStorage
        restoreMessagesFromLocalStorage() {
            try {
                // NOVA SOLUÇÃO: Usar a chave que tem TODAS as mensagens
                const localStorageKey = `all_messages_${Utils.getConversationId()}`;
                const savedMessages = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
                
                if (savedMessages.length > 0) {
                    console.log('✨ RECUPERANDO TODAS AS MENSAGENS do localStorage:', savedMessages.length);
                    
                    // Ordenar mensagens por timestamp para garantir ordem correta
                    savedMessages.sort((a, b) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        return timeA - timeB;
                    });
                    
                    // Para cada mensagem salva
                    savedMessages.forEach(msg => {
                        // Garantir que todas as flags de preservação estejam presentes
                        msg.permanent = true;
                        msg.preserve = true;
                        msg.fixed = true;
                        msg.restoredFromStorage = true;
                        
                        // Verificar se a mensagem já existe no DOM ou no mapa
                        const existingElement = this.messagesContainer.querySelector(`[data-message-id="${msg.id}"]`);
                        const existsInMap = this.messages.has(msg.id);
                        
                        if (!existingElement && !existsInMap) {
                            console.log('✅ Restaurando mensagem do localStorage:', msg.id, msg.type);
                            // Adicionar ao mapa de mensagens
                            this.messages.set(msg.id, msg);
                            
                            // Adicionar diretamente ao DOM - respeitando a ordem
                            try {
                                // Criar manualmente a mensagem seguindo estilos shadcn
                                const messageDiv = document.createElement('div');
                                messageDiv.setAttribute('data-message-id', msg.id);
                                
                                // Posicionar a mensagem baseado no tipo com animação de entrada
                                if (msg.type === 'client') {
                                    messageDiv.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:12px;';
                                } else {
                                    messageDiv.style.cssText = 'display:flex; justify-content:flex-start; margin-bottom:12px;';
                                }
                                
                                // Criar a bolha da mensagem
                                const bubble = document.createElement('div');
                                
                                // Aplicar estilos diferentes baseados no tipo de mensagem com bordas mais arredondadas para shadcn
                                if (msg.type === 'client') {
                                    bubble.style.cssText = 'background-color:#4F46E5; color:white; position:relative; ' +
                                        'max-width:80%; padding:12px; border-radius:12px 2px 12px 12px; font-size:14px; ' +
                                        'box-shadow:0 2px 4px rgba(0,0,0,0.1); word-break:break-word; font-family:system-ui,-apple-system,sans-serif;';
                                } else {
                                    bubble.style.cssText = 'background-color:#f1f5f9; color:#334155; position:relative; ' +
                                        'max-width:80%; padding:12px; border-radius:2px 12px 12px 12px; font-size:14px; ' +
                                        'box-shadow:0 1px 3px rgba(0,0,0,0.1); word-break:break-word; font-family:system-ui,-apple-system,sans-serif;';
                                }
                                
                                // Adicionar o texto da mensagem
                                bubble.innerText = msg.text;
                                
                                // Adicionar timestamp
                                const time = document.createElement('div');
                                time.style.cssText = 'font-size:10px; opacity:0.7; margin-top:4px; text-align:right;';
                                time.innerText = this.formatTime(msg.timestamp);
                                
                                // Montar a estrutura
                                bubble.appendChild(time);
                                messageDiv.appendChild(bubble);
                                
                                // Adicionar ao DOM
                                this.messagesContainer.appendChild(messageDiv);
                                console.log('✨ Mensagem recuperada e adicionada ao DOM com sucesso!', msg.id);
                            } catch (renderError) {
                                console.error('Erro ao renderizar mensagem recuperada:', renderError);
                            }
                        }
                    });
                    
                    // Rolar para o fim da conversa
                    this.scrollToBottom();
                }
            } catch (error) {
                console.error('Erro ao restaurar mensagens do localStorage:', error);
            }
        }

        renderUserForm() {
            const formContainer = Utils.createElement('div', 'flex-1 p-6 flex flex-col justify-center');
            formContainer.innerHTML = `
                <h3 class="text-2xl font-semibold text-gray-800 mb-4 text-center">Bem-vindo!</h3>
                <p class="text-gray-600 mb-6 text-center">Preencha seus dados para iniciar o atendimento</p>
                <form class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-700">Nome</label>
                        <input name="name" type="text" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 text-black" placeholder="Seu nome">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700">E-mail</label>
                        <input name="email" type="email" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 text-black" placeholder="seu@email.com">
                    </div>
                    <button type="submit" class="w-full p-3 text-white rounded-lg transition hover:opacity-90" style="background-color: ${this.config.bubbleColor};">
                        Iniciar
                    </button>
                </form>
            `;
            formContainer.querySelector('form').onsubmit = (e) => this.handleUserSubmit(e);
            this.container.appendChild(formContainer);
        }

        renderChatUI() {
            if (this.chatUIRendered) return;
            this.chatUIRendered = true;

            this.container.innerHTML = '';
            this.renderHeader();

            this.messagesContainer = Utils.createElement('div', 'flex-1 overflow-y-auto p-2 sm:p-4 space-y-3', {
                style: 'background-color: #f9f9f9; overscroll-behavior: contain;'
            });
            
            // Adicionar indicador de carregamento no container de mensagens
            this.loadingIndicator = Utils.createElement('div', 'flex justify-center items-center py-6');
            this.loadingIndicator.innerHTML = `
                <div class="loading-spinner flex justify-center items-center">
                    <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            `;
            
            // Adicionar estilos para o spinner
            const spinnerStyle = document.createElement('style');
            spinnerStyle.textContent = `
                .loading-spinner { text-align: center; }
                .spinner { 
                    display: inline-block; 
                    width: 40px; 
                    height: 40px; 
                    border: 3px solid rgba(79, 70, 229, 0.2); 
                    border-radius: 50%; 
                    border-top-color: #4F46E5; 
                    animation: spin 1s ease-in-out infinite; 
                }
                @keyframes spin { 
                    to { transform: rotate(360deg); } 
                }
            `;
            document.head.appendChild(spinnerStyle);
            
            this.messagesContainer.appendChild(this.loadingIndicator);
            this.container.appendChild(this.messagesContainer);
            
            // SOLUÇÃO DEFINITIVA: Restaurar as mensagens salvas do localStorage
            // Comentado para evitar conflito com loadHistory que busca do servidor
            // this.restoreMessagesFromLocalStorage();

            this.typingIndicator = Utils.createElement('div', 'px-2 sm:px-4 pb-2 text-sm text-gray-500 hidden', { id: 'typing', style: 'display: none;' });
            this.typingIndicator.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="typing-animation">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                    Digitando...
                </div>
            `;
            this.container.appendChild(this.typingIndicator);

            // Criar o container para o input de mensagem seguindo as convenções shadcn UI
            const footer = Utils.createElement('footer', 'p-2 sm:p-4 bg-background border-t border-border');
            footer.innerHTML = `
                <form class="flex gap-2">
                    <input type="text" class="flex-1 p-3 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-card text-black" placeholder="Digite sua mensagem...">
                    <button type="submit" class="p-2 sm:p-3 text-black rounded-full transition hover:bg-primary/90 bg-primary flex items-center justify-center" style="min-width: 48px;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            `;
            const input = footer.querySelector('input');
            input.oninput = Utils.debounce(() => this.handleTyping(), 300);
            footer.querySelector('form').onsubmit = (e) => this.handleMessageSubmit(e);
            this.container.appendChild(footer);
            this.inputContainer = footer;
            
            // Controlar a visibilidade do input com base no estado do chat
            if (this.inFlowMode) {
                // Se estamos em modo de fluxo, ocultar o input
                this.inputContainer.style.display = 'none';
            } else if (this.isInitialized) {
                // Se o chat está inicializado e não estamos em modo de fluxo, mostrar o input
                this.inputContainer.style.display = 'block';
            } else {
                // Se o chat não está inicializado, ocultar o input
                this.inputContainer.style.display = 'none';
            }
        }

        async handleUserSubmit(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userInfo = { name: formData.get('name'), email: formData.get('email') };
            Utils.setCache('chat_user_info', userInfo);
            Utils.setCache('chat_initialized', true);
            this.userInfo = userInfo;
            this.isInitialized = true;
            this.chatUIRendered = false;
            this.messages.clear();
            Utils.setConversationId(Utils.generateId()); // Garante um novo ID para a nova sessão
            this.container.innerHTML = '';
            this.renderHeader();
            this.renderChatUI();
            
            // Reinicializar o WebSocket com o novo ID de conversa
            console.log('Reinicializando WebSocket após envio do formulário de usuário');
            if (this.ws) {
                // Fechar qualquer conexão existente
                try {
                    this.ws.socket?.close();
                } catch (e) {
                    console.log('Erro ao fechar socket antigo:', e);
                }
                this.ws = null;
            }
            
            // Criar nova conexão WebSocket
            this.ws = new WebSocketManager(this);
            
            // Garantir que o WebSocket esteja pronto
            let wsCheckAttempts = 0;
            const checkWebSocketReady = () => {
                if (this.ws && this.ws.socket && this.ws.socket.readyState === WebSocket.OPEN) {
                    console.log('WebSocket inicializado e conectado com sucesso após envio do formulário!');
                    // Forçar a marcação como pronto após conexão
                    setTimeout(() => {
                        this.ws.isReady = true;
                        console.log('WebSocket marcado como pronto após inicialização no formulário');
                    }, 500);
                } else if (wsCheckAttempts < 5) {
                    wsCheckAttempts++;
                    console.log(`Tentativa ${wsCheckAttempts} de verificar WebSocket no formulário, aguardando...`);
                    setTimeout(checkWebSocketReady, 1000);
                } else {
                    console.warn('WebSocket não conectou após múltiplas tentativas no formulário');
                }
            };
            
            // Iniciar verificação após um pequeno delay
            setTimeout(checkWebSocketReady, 500);
            
            await this.sendWelcomeMessage();
        }

        async sendWelcomeMessage() {
            const cacheKey = `chat_history_${Utils.getConversationId()}`;
            const cachedMessages = Utils.getCache(cacheKey) || [];
            const welcomeText = Utils.replacePlaceholders(this.config.welcomeMessage, this.userInfo);

            if (cachedMessages.some(msg => msg.type === 'admin' && msg.text === welcomeText)) {
                console.log('Welcome message already exists in cache, loading from cache:', welcomeText);
                this.loadHistory();
                return;
            }

            const messageId = Utils.generateId();
            const tempMessage = {
                id: messageId,
                text: welcomeText,
                type: 'admin',
                timestamp: new Date().toISOString(),
                isTemp: true
            };

            this.addMessage(tempMessage, false);

            try {
                const response = await ApiClient.postMessage(welcomeText, 'admin', this.userInfo);
                if (response?.message) {
                    console.log('Server response for welcome message:', response.message);
                    this.replaceMessage(messageId, {
                        ...response.message,
                        id: response.message.id || messageId
                    });
                    const cached = Utils.getCache(cacheKey) || [];
                    if (!cached.some(msg => msg.id === response.message.id)) {
                        cached.push(response.message);
                        Utils.setCache(cacheKey, cached);
                    }
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem de boas-vindas:', error);
                this.showError('Erro ao iniciar o chat.');
                this.messages.delete(messageId);
                this.messagesContainer.querySelector(`[data-message-id="${messageId}"]`)?.remove();
            }
        }

        handleMessageSubmit(e) {
            e.preventDefault();
            const input = e.target.querySelector('input');
            const text = input.value.trim();
            if (!text) return;

            // Limpar o input imediatamente
            input.value = '';
            
            // Verificar se já existe uma mensagem idêntica para evitar duplicação
            const existingMessage = Array.from(this.messages.values()).find(
                m => m.text === text && m.type === 'client' && !m.isTemp
            );
            
            if (existingMessage) {
                console.log('Mensagem idêntica já existe, ignorando:', text);
                return;
            }
            
            // Criar ID único para a mensagem
            const tempId = Utils.generateId();
            
            // SOLUÇÃO DEFINITIVA: Salvar todas as mensagens no localStorage
            // Recuperar mensagens anteriores do localStorage
            const localStorageKey = `client_messages_${Utils.getConversationId()}`;
            const savedMessages = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
            
            // Criar a mensagem com flags de preservação
            const tempMessage = { 
                id: tempId, 
                text, 
                type: 'client', 
                timestamp: new Date().toISOString(),
                // FLAGS CRUCIAIS DE PRESERVAÇÃO
                processed: true,
                permanent: true,
                preserve: true,
                fixed: true,
                clientOriginal: true,
                localStorageSaved: true
            };
            
            // Adicionar a mensagem ao mapa
            this.messages.set(tempId, tempMessage);
            
            // Salvar a mensagem no localStorage para garantir persistência
            savedMessages.push(tempMessage);
            localStorage.setItem(localStorageKey, JSON.stringify(savedMessages));
            console.log('✅ Mensagem salva no localStorage para persistência:', tempMessage.id);
            
            // Adicionar a mensagem ao chat imediatamente
            this.addClientMessage(tempMessage);
            
            // Enviar para o servidor em segundo plano
            this._sendMessageAsync(tempId, text);
        }

        // Método para adicionar mensagem do cliente ao chat
        // Método simplificado para adicionar mensagem do cliente
        addClientMessage(message) {
            console.log('addClientMessage chamado com:', message);
            
            if (!this.messagesContainer) {
                console.error('Container de mensagens não encontrado!');
                return;
            }
            
            // Verificar se a mensagem já existe no DOM para evitar duplicação
            const existingElement = this.messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
            if (existingElement) {
                console.log('Elemento da mensagem já existe no DOM, não duplicando:', message.id);
                return;
            }
            
            // Criar manualmente a estrutura da mensagem do cliente seguindo padrão shadcn
            const messageDiv = document.createElement('div');
            messageDiv.setAttribute('data-message-id', message.id);
            
            // Posicionar a mensagem baseado no tipo com animação de entrada
            if (message.type === 'client') {
                messageDiv.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:12px;';
            } else {
                messageDiv.style.cssText = 'display:flex; justify-content:flex-start; margin-bottom:12px;';
            }
            
            // Criar a bolha da mensagem
            const bubble = document.createElement('div');
            
            // Aplicar estilos diferentes baseados no tipo de mensagem com bordas mais arredondadas para shadcn
            if (message.type === 'client') {
                bubble.style.cssText = 'background-color:#4F46E5; color:white; position:relative; ' +
                    'max-width:80%; padding:12px; border-radius:12px 2px 12px 12px; font-size:14px; ' +
                    'box-shadow:0 2px 4px rgba(0,0,0,0.1); word-break:break-word;';
            } else {
                bubble.style.cssText = 'background-color:#f1f5f9; color:#334155; position:relative; ' +
                    'max-width:80%; padding:12px; border-radius:2px 12px 12px 12px; font-size:14px; ' +
                    'box-shadow:0 1px 3px rgba(0,0,0,0.1); word-break:break-word;';
            }
            
            // Adicionar o texto da mensagem
            bubble.innerText = message.text;
            
            // Adicionar timestamp
            const time = document.createElement('div');
            time.style.cssText = 'font-size:10px; opacity:0.7; margin-top:4px; text-align:right;';
            time.innerText = this.formatTime(message.timestamp);
            
            // Montar a estrutura
            bubble.appendChild(time);
            messageDiv.appendChild(bubble);
            
            // Adicionar ao DOM
            this.messagesContainer.appendChild(messageDiv);
            
            console.log('Mensagem do cliente adicionada ao DOM:', message.id);
        }
        
        // Método privado para enviar mensagem de forma assíncrona
        _sendMessageAsync(tempId, text) {
            // SOLUÇÃO DEFINITIVA: implementação completa para resolver o problema de mensagens desaparecendo
            try {
                // Verificar se a conversa existe em paralelo (sem bloquear)
                this._checkConversationExistsAsync();
                
                // Verificar se essa mensagem já foi enviada (prevenção contra duplo-clique)
                if (!this._messageTracker) {
                    this._messageTracker = {
                        sent: new Map(),
                        processed: new Set()
                    };
                }
                
                // Verificar se o conteúdo exato foi enviado nos últimos 2 segundos
                const now = Date.now();
                const recentlySentTime = this._messageTracker.sent.get(text);
                
                if (recentlySentTime && (now - recentlySentTime) < 2000) {
                    console.warn('PREVENÇÃO DE DUPLICAÇÃO: Mensagem idêntica enviada há menos de 2 segundos:', text);
                    return; // Prevenção contra cliques duplos ou múltiplos envios
                }
                
                // Registrar esta mensagem para evitar duplo envio
                this._messageTracker.sent.set(text, now);
                
                // Limpar entradas antigas do tracker a cada 10 segundos
                if (!this._cleanupInterval) {
                    this._cleanupInterval = setInterval(() => {
                        const cutoff = Date.now() - 10000; // 10 segundos
                        
                        for (const [msg, timestamp] of this._messageTracker.sent.entries()) {
                            if (timestamp < cutoff) {
                                this._messageTracker.sent.delete(msg);
                            }
                        }
                    }, 10000);
                }
                
                console.log('ENVIANDO MENSAGEM (garantida):', tempId, text);
                
                // CRÍTICO: Antes de qualquer coisa, garantir que a mensagem apareça no DOM
                const clientMsg = {
                    id: tempId,
                    type: 'client',
                    sender_type: 'client',
                    text: text,
                    message: text,
                    originalText: text, // Guardar o texto original para comparações
                    timestamp: new Date().toISOString(),
                    // FLAGS CRUCIAIS para garantir que a mensagem NUNCA desapareça
                    fromClient: true,
                    preserve: true,  
                    permanent: true,  // Mensagem nunca deve ser removida
                    clientOriginal: true,
                    processed: true,
                    // ID da primeira mensagem para rastreamento
                    isFirstMessage: this.messages.size === 0,
                    // Dados do registro
                    _debug: {
                        createdAt: now,
                        source: 'client_direct_input'
                    }
                };
                
                // 1. Adicionar ao DOM para feedback visual instantâneo
                this.addClientMessage(clientMsg);
                // 2. Registrar no mapa interno de mensagens (crucial para rastreamento)
                this.messages.set(tempId, clientMsg);
                // 3. Adicionar ID à lista de mensagens já processadas
                this._messageTracker.processed.add(tempId);
                
                console.log('✅ GARANTIA: Mensagem do cliente adicionada ao DOM/mapa com proteções:', tempId);
                
                // Tentar enviar pelo WebSocket para processamento em realtime
                if (this.ws && this.ws.socket) {
                try {
                    // Criar objeto de mensagem para enviar via WebSocket
                    const wsMsg = {
                        event: 'client_message',
                        data: JSON.stringify({
                            conversation_id: Utils.getConversationId(),
                            message: text,
                            sender_type: 'client',
                            temp_id: tempId,
                            user_info: this.userInfo
                        })
                    };
                    
                    // Verificar se o WebSocket está pronto para enviar
                    if (this.ws.socket.readyState === WebSocket.OPEN) {
                        if (this.ws.isReady) {
                            // Enviar diretamente pelo WebSocket
                            this.ws.socket.send(JSON.stringify(wsMsg));
                            console.log('Mensagem enviada via WebSocket para notificar outros usuários');
                        } else {
                            // Adicionar à fila se conectado mas não inscrito ainda
                            this.ws.messageQueue.push(wsMsg);
                            console.log('WebSocket conectado mas não pronto, mensagem adicionada à fila');
                        }
                    } else {
                        console.warn('WebSocket não está aberto, apenas enviando pela API');
                    }
                } catch (wsError) {
                    console.error('Erro ao processar mensagem para WebSocket:', wsError);
                }
            } else {
                console.warn('WebSocket não está inicializado, apenas enviando pela API');
            }
            
            // Ainda enviamos via API para garantir persistência
            ApiClient.postMessage(text, 'client', this.userInfo)
                .then(response => {
                    console.log('Resposta do servidor para mensagem:', response);
                    
                    // Se recebeu resposta válida do servidor
                    if (response?.message) {
                        // Obter o ID permanente da mensagem
                        const messageId = response.message.id || tempId;
                        
                        // Verificar se a mensagem ainda existe no DOM
                        const messageElement = this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
                        if (messageElement) {
                            // Atualizar o ID no elemento DOM
                            messageElement.setAttribute('data-message-id', messageId);
                            
                            // Atualizar no mapa de mensagens
                            if (this.messages.has(tempId)) {
                                const existingMsg = this.messages.get(tempId);
                                const updatedMsg = {
                                    ...existingMsg,
                                    id: messageId, // Usar o ID do servidor
                                    fromServer: true,
                                    // Manter flags de preservação
                                    permanent: true,
                                    preserve: true,
                                    clientOriginal: true
                                };
                                
                                // Atualizar elementos DOM com o novo ID sem remover
                                const msgElement = this.messagesContainer.querySelector(`[data-message-id="${existingMsg.id}"]`);
                                if (msgElement) {
                                    msgElement.setAttribute('data-message-id', messageId);
                                    msgElement.setAttribute('data-preserved', 'true');
                                }
                                
                                // Atualizar no mapa de mensagens
                                this.messages.delete(tempId);
                                this.messages.set(messageId, updatedMsg);
                            }
                        }
                    }
                })
                .catch(error => {
                    console.error('Erro ao enviar mensagem:', error);
                    this.showError('Falha ao enviar mensagem. Tente novamente.');
                });
            } catch (e) {
                console.error('Erro durante o envio da mensagem:', e);
            }
        }

        // Método privado para verificar se a conversa existe
        _checkConversationExistsAsync() {
            const conversationId = Utils.getConversationId();
            ApiClient.checkConversationExists(conversationId)
                .then(conversationExists => {
                    if (!conversationExists) {
                        console.log('Conversa não existe mais, reiniciando o chat do zero...');
                        this.showError('A conversa anterior não existe mais. Iniciando uma nova sessão.');
                        this.resetChat(); // Reinicia completamente o chat
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar conversa:', error);
                });
        }

        async handleTyping() {
            try {
                const input = this.container.querySelector('input');
                const isTyping = !!input?.value;

                if (this.typingTimeout) clearTimeout(this.typingTimeout);

                if (isTyping) {
                    // Enviar evento de digitação
                    await ApiClient.broadcastTyping(true, this.userInfo);
                    
                    // Definir timeout para enviar evento de parar de digitar após 1 segundo
                    this.typingTimeout = setTimeout(async () => {
                        await ApiClient.broadcastTyping(false, this.userInfo);
                        
                        // Enviar novamente após um breve intervalo para garantir que seja recebido
                        setTimeout(async () => {
                            await ApiClient.broadcastTyping(false, this.userInfo);
                        }, 300);
                    }, 1000);
                } else {
                    // Enviar evento de parar de digitar imediatamente
                    await ApiClient.broadcastTyping(false, this.userInfo);
                    
                    // Enviar novamente após um breve intervalo para garantir que seja recebido
                    setTimeout(async () => {
                        await ApiClient.broadcastTyping(false, this.userInfo);
                    }, 300);
                }
            } catch (error) {
                console.error('Erro ao processar digitação:', error);
            }
        }

        adjustColor(color, percent) {
            const num = parseInt(color.slice(1), 16);
            const amt = Math.round(2.55 * percent);
            let R = (num >> 16) + amt;
            let G = (num >> 8 & 0x00FF) + amt;
            let B = (num & 0x0000FF) + amt;
            return `#${(
                0x1000000 +
                (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
                (B < 255 ? (B < 1 ? 0 : B) : 255)
            ).toString(16).slice(1)}`;
        }

        // Método para formatar horário de mensagens
        formatTime(timestamp) {
            try {
                if (typeof timestamp === 'string') {
                    // Se for uma string no formato brasileiro (dd/mm/yyyy hh:mm:ss)
                    if (timestamp.includes('/')) {
                        const parts = timestamp.split(' ');
                        if (parts.length > 1) {
                            return parts[1].substring(0, 5); // Pegar apenas hh:mm
                        }
                    }
                    // Tentar converter para Date e formatar
                    const date = new Date(timestamp);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                }
                // Caso não consiga parsear, retornar a hora atual
                return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                console.error('Erro ao formatar data:', e);
                return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        // Método simplificado para criar elemento de mensagem
        _createMessageElement(message) {
            console.log('_createMessageElement chamado com:', message);
            
            // Extraír informações básicas da mensagem
            const messageId = message.id;
            const messageType = message.sender_type || message.type || (message.sender_id === 1 ? 'admin' : 'client');
            const messageText = message.message || message.text || '';
            const messageTimestamp = message.created_at || message.timestamp || new Date().toLocaleString('pt-BR');
            
            // Criar o container da mensagem (usando document.createElement para máxima compatibilidade)
            const messageDiv = document.createElement('div');
            messageDiv.setAttribute('data-message-id', messageId);
            
            // Aplicando estilos inline para garantir que funcionem
            if (messageType === 'client') {
                messageDiv.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:10px;';
            } else {
                messageDiv.style.cssText = 'display:flex; justify-content:flex-start; margin-bottom:10px;';
            }
            
            // Criar a bolha da mensagem
            const bubble = document.createElement('div');
            
            // Definir estilos básicos para a bolha
            const bubbleStyle = 'position:relative; max-width:80%; padding:12px; '
                + 'border-radius:8px; font-size:14px; box-shadow:0 1px 2px rgba(0,0,0,0.1); word-break:break-word;';
                
            // Aplicar cores diferentes baseados no tipo de mensagem
            if (messageType === 'client') {
                bubble.style.cssText = bubbleStyle + 'background-color:#4F46E5; color:white;';
            } else {
                bubble.style.cssText = bubbleStyle + 'background-color:#f1f5f9; color:#334155;';
            }
            
            // Adicionar o texto da mensagem diretamente na bolha
            bubble.innerText = messageText;
            
            // Adicionar timestamp
            const time = document.createElement('div');
            time.style.cssText = 'font-size:10px; opacity:0.7; margin-top:4px; text-align:right;';
            time.innerText = this.formatTime(messageTimestamp);
            
            // Montar a estrutura: bubble > time + messageDiv > bubble
            bubble.appendChild(time);
            messageDiv.appendChild(bubble);
            
            console.log('Elemento de mensagem criado:', messageDiv);
            return messageDiv;
        }
        
        // Formatar hora da mensagem
        formatTime(timestamp) {
            try {
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        addMessage(msg, fromServer = false) {
            // SOLUÇÃO SUPER SIMPLIFICADA - IGNORAR TODA LÓGICA COMPLEXA
            
            // Compatibilidade com diferentes formatos de mensagem
            const messageId = msg.id || Utils.generateId();
            const messageType = msg.sender_type || msg.type || (msg.sender_id === 1 ? 'admin' : 'client');
            const messageText = msg.message || msg.text || '';
            const messageTimestamp = msg.created_at || msg.timestamp || new Date().toISOString();
            
            // Para evitar mensagens vazias
            if (!messageText.trim()) {
                console.warn('Tentativa de adicionar mensagem vazia, ignorando');
                return;
            }
            
            // SEMPRE PRESERVAR TODAS AS MENSAGENS
            msg.permanent = true;
            msg.preserve = true;
            msg.fixed = true;
            
            // Log mais detalhado para rastrear o fluxo das mensagens
            console.log(`NOVA ABORDAGEM: Adicionando mensagem [${messageType}] ID: ${messageId}, ` + 
                      `Texto: ${messageText.length > 20 ? messageText.substring(0, 20) + '...' : messageText}`);
            
            // Verificar se temos elemento com EXATAMENTE o mesmo ID no DOM
            // Apenas isto controla duplicação - super simples
            const existingElement = this.messagesContainer && this.messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
            if (existingElement) {
                console.log('⚠️ Elemento com mesmo ID já existe no DOM, ignorando duplicata:', messageId);
                return;
            }
            
            // Inicializar o mapa de mensagens se ainda não existir
            if (!this.messages) {
                this.messages = new Map();
            }
            
            // Verificar se a mensagem com exatamente o mesmo ID já existe
            if (this.messages.has(messageId)) {
                console.log('Message already exists, skipping:', messageId);
                return;
            }

            // Verificar mensagem de boas-vindas duplicada
            const welcomeText = Utils.replacePlaceholders(this.config.welcomeMessage, this.userInfo || {});
            if (messageType === 'admin' && messageText === welcomeText) {
                const existingWelcome = Array.from(this.messages.values()).find(
                    m => m.type === 'admin' && m.text === welcomeText
                );
                if (existingWelcome) {
                    console.log('Merging duplicate welcome message:', messageId, 'with existing:', existingWelcome.id);
                    this.replaceMessage(existingWelcome.id, {
                        ...existingWelcome,
                        timestamp: messageTimestamp || existingWelcome.timestamp,
                    });
                    return;
                }
            }

            // Adicionar mensagem ao mapa com flags importantes
            const normalizedMsg = {
                id: messageId,
                type: messageType,
                text: messageText,
                timestamp: messageTimestamp,
                // Todas as mensagens agora são permanentes e preservadas
                permanent: true,
                preserve: true,
                fixed: true,
                clientOriginal: messageType === 'client',
                isFirstMessage: messageType === 'client' && Array.from(this.messages.values()).filter(m => m.type === 'client').length === 0,
                // Adicionar flag para preservar no backend se for do cliente
                shouldPreserve: true
            };
            
            // Comentado para evitar conflito com loadHistory que busca do servidor
            // SOLUÇÃO DEFINITIVA: Salvar no localStorage imediatamente para garantir persistência
            // const localStorageKey = `all_messages_${Utils.getConversationId()}`;
            // const savedMessages = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
            // if (!savedMessages.some(m => m.id === messageId)) {
            //     savedMessages.push(normalizedMsg);
            //     localStorage.setItem(localStorageKey, JSON.stringify(savedMessages));
            //     console.log('✨ Mensagem salva no localStorage para garantir persistência:', messageId);
            // }
            
            this.messages.set(messageId, normalizedMsg);

            // Tentar criar e adicionar o elemento da mensagem ao DOM
            try {
                // Verificar se o container de mensagens existe
                if (!this.messagesContainer) {
                    console.error('Container de mensagens não encontrado no addMessage');
                    return;
                }
                
                // Criar manualmente a mensagem seguindo estilos shadcn
                const messageDiv = document.createElement('div');
                messageDiv.setAttribute('data-message-id', messageId);
                
                // Posicionar a mensagem baseado no tipo com animação de entrada
                if (messageType === 'client') {
                    messageDiv.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:12px; animation:fadeIn 0.3s ease-in-out;';
                } else {
                    messageDiv.style.cssText = 'display:flex; justify-content:flex-start; margin-bottom:12px; animation:fadeIn 0.3s ease-in-out;';
                }
                
                // Criar a bolha da mensagem
                const bubble = document.createElement('div');
                
                // Aplicar estilos diferentes baseados no tipo de mensagem com bordas mais arredondadas para shadcn
                if (messageType === 'client') {
                    bubble.style.cssText = 'background-color:#4F46E5; color:white; position:relative; ' +
                        'max-width:80%; padding:12px; border-radius:12px 2px 12px 12px; font-size:14px; ' +
                        'box-shadow:0 2px 4px rgba(0,0,0,0.1); word-break:break-word; font-family:system-ui,-apple-system,sans-serif;';
                } else {
                    bubble.style.cssText = 'background-color:#f1f5f9; color:#334155; position:relative; ' +
                        'max-width:80%; padding:12px; border-radius:2px 12px 12px 12px; font-size:14px; ' +
                        'box-shadow:0 1px 3px rgba(0,0,0,0.1); word-break:break-word; font-family:system-ui,-apple-system,sans-serif;';
                }
                
                // Adicionar o texto da mensagem
                bubble.innerText = messageText;
                
                // Adicionar timestamp
                const time = document.createElement('div');
                time.style.cssText = 'font-size:10px; opacity:0.7; margin-top:4px; text-align:right;';
                time.innerText = this.formatTime(messageTimestamp);
                
                // Montar a estrutura
                bubble.appendChild(time);
                messageDiv.appendChild(bubble);
                
                // Adicionar ao DOM
                this.messagesContainer.appendChild(messageDiv);
                
                // Incrementar contador de notificações se for uma mensagem do admin
                if (messageType === 'admin' && fromServer) {
                    this.incrementNotification();
                }
                
                // Rolar para o final da conversa
                this.scrollToBottom();
                
                console.log('Mensagem adicionada ao DOM com sucesso:', messageId);
            } catch (error) {
                console.error('Erro ao adicionar mensagem:', error);
            }

            // Salvar no cache se necessário
            if (!fromServer || messageType !== 'client') {
                const cacheKey = `chat_history_${Utils.getConversationId()}`;
                const cached = Utils.getCache(cacheKey) || [];
                if (!cached.some(m => m.id === messageId)) {
                    cached.push(normalizedMsg);
                    Utils.setCache(cacheKey, cached);
                }
            }
        }

        replaceMessage(tempId, message) {
            console.log('Replacing message:', tempId, 'with:', message);
            
            // Normalizar os campos da mensagem para garantir compatibilidade
            const messageText = message.message || message.text || '';
            const messageType = message.sender_type || message.type || (message.sender_id === 1 ? 'admin' : 'client');
            const messageId = message.id || Utils.generateId();
            
            // Elemento DOM da mensagem temporária
            const tempElement = this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
            
            // Verificar se a mensagem já existe no mapa (evitar duplicação)
            if (this.messages.has(messageId) && messageId !== tempId) {
                console.log('Mensagem já existe no mapa, removendo temporária:', tempId);
                
                // Remover mensagem temporária se existir
                if (tempId && this.messages.has(tempId)) {
                    if (tempElement) {
                        tempElement.remove();
                        this.messages.delete(tempId);
                    }
                }
                return;
            }
            
            // Verificar se existe uma mensagem com conteúdo idêntico
            if (messageType === 'client') {
                const duplicateMsg = Array.from(this.messages.values()).find(m => 
                    m.id !== tempId && 
                    m.id !== messageId && 
                    m.type === 'client' && 
                    (m.text === messageText || m.originalText === messageText)
                );
                
                if (duplicateMsg) {
                    console.log('Conteúdo duplicado detectado, ignorando:', messageText);
                    
                    // Remover mensagem temporária
                    if (tempId && this.messages.has(tempId)) {
                        const tempElement = this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
                        if (tempElement) {
                            tempElement.remove();
                            this.messages.delete(tempId);
                        }
                    }
                    return;
                }
            }
            
            // Verificar se a mensagem temporária está marcada como 'preserve'
            if (tempId && this.messages.has(tempId)) {
                const tempMsg = this.messages.get(tempId);
                
                // Se a mensagem está marcada para preservar, apenas atualizar o ID
                if (tempMsg.preserve || tempMsg.clientOriginal) {
                    console.log('Mensagem marcada para preservação, mantendo-a: ', tempId);
                    const tempElement = this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
                    if (tempElement) {
                        // Apenas atualizar o ID no elemento, mas não remover
                        tempElement.setAttribute('data-message-id', messageId);
                    }
                    
                    // Atualizar no mapa sem remover a mensagem
                    const preservedMsg = {
                        ...tempMsg,
                        id: messageId,
                        preserve: true,  // Manter a marcação
                        clientOriginal: true
                    };
                    this.messages.set(messageId, preservedMsg);
                    this.messages.delete(tempId);
                } else {
                    // Comportamento padrão para mensagens não preservadas
                    const tempElement = this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
                    if (tempElement) {
                        tempElement.remove();
                        this.messages.delete(tempId);
                    }
                }
            }
            
            // Atualizar a mensagem ou adicionar se não existir
            if (!this.messages.has(messageId)) {
                // Se temos o elemento temporário, vamos atualizar ele em vez de criar um novo
                if (tempElement) {
                    // Criar uma versão normalizada da mensagem
                    const normalizedMessage = {
                        ...message,
                        id: messageId,
                        type: messageType,
                        text: messageText,
                        timestamp: message.timestamp || message.created_at || new Date().toISOString()
                    };
                    
                    // Atualizar o DOM sem remover e re-adicionar o elemento
                    tempElement.setAttribute('data-message-id', messageId);
                    
                    // Atualizar o texto da mensagem na bolha
                    const bubble = tempElement.querySelector('div[class*="chat-bubble"]');
                    if (bubble) {
                        // Guardar elementos filhos (como timestamp)
                        const children = Array.from(bubble.childNodes).filter(node => node.nodeType === 1);
                        
                        // Limpar conteúdo texto mantendo apenas elementos filho
                        bubble.childNodes.forEach(node => {
                            if (node.nodeType === 3) { // Nó de texto
                                node.remove();
                            }
                        });
                        
                        // Adicionar o novo texto
                        bubble.prepend(document.createTextNode(messageText));
                    }
                    
                    // Remover a mensagem temporária do mapa e adicionar a nova
                    this.messages.delete(tempId);
                    this.messages.set(messageId, normalizedMessage);
                    
                    // Atualizar o cache
                    const cacheKey = `chat_history_${Utils.getConversationId()}`;
                    const cached = Utils.getCache(cacheKey) || [];
                    const cacheIndex = cached.findIndex(m => m.id === tempId);
                    if (cacheIndex !== -1) {
                        cached[cacheIndex] = normalizedMessage;
                    } else {
                        cached.push(normalizedMessage);
                    }
                    Utils.setCache(cacheKey, cached);
                    
                    console.log('Message element updated in place:', messageId);
                } else {
                    // Se não temos elemento temporário, adicionar normalmente
                    const normalizedMessage = {
                        ...message,
                        id: messageId,
                        type: messageType,
                        text: messageText,
                        timestamp: message.timestamp || message.created_at || new Date().toISOString()
                    };
                    
                    this.addMessage(normalizedMessage, true);
                }
            }
        }

        scrollToBottom() {
            requestAnimationFrame(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            });
        }

        showTyping(isTyping) {
            console.log('Showing typing indicator:', isTyping);
            if (!this.typingIndicator) {
                console.error('Typing indicator element not found');
                return;
            }
            
            // Limpar qualquer timeout existente
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
                this.typingTimeout = null;
            }
            
            requestAnimationFrame(() => {
                if (isTyping) {
                    // Garantir que o indicador seja visível
                    this.typingIndicator.classList.remove('hidden');
                    this.typingIndicator.style.display = 'flex';
                    // Rolar para o final para mostrar o indicador
                    this.scrollToBottom();
                    
                    // Definir um timeout para ocultar o indicador após 3 segundos
                    // caso não receba outro evento de digitação
                    this.typingTimeout = setTimeout(() => {
                        this.hideTypingIndicator();
                    }, 3000);
                } else {
                    this.hideTypingIndicator();
                }
            });
        }
        
        hideTypingIndicator() {
            if (this.typingIndicator) {
                this.typingIndicator.classList.add('hidden');
                this.typingIndicator.style.display = 'none';
                console.log('Typing indicator hidden');
            }
        }

        toggle() {
            this.isOpen = !this.isOpen;
            
            // Verificar se this.container existe antes de tentar acessar suas propriedades
            if (this.container) {
                this.container.classList.toggle('opacity-0', !this.isOpen);
                this.container.classList.toggle('translate-y-4', !this.isOpen);
                this.container.classList.toggle('pointer-events-none', !this.isOpen);
                
                if (this.isOpen && this.isInitialized) {
                    this.checkAndLoadHistory();
                }
            } else {
                console.error('Container não encontrado ao tentar alternar a visibilidade do chat');
                // Se o container não existir, tentar renderizá-lo novamente
                this.renderChat();
            }
        }

        async checkAndLoadHistory() {
            const conversationExists = await ApiClient.checkConversationExists(Utils.getConversationId());
            if (!conversationExists) {
                console.log('Conversa não existe ao abrir, reiniciando o chat...');
                this.showError('A conversa anterior não existe mais. Iniciando uma nova sessão.');
                this.resetChat();
            } else {
                this.loadHistory();
                this.clearNotifications();
            }
        }

        showError(message) {
            const errorDiv = Utils.createElement('div', 'p-2 text-center text-red-600 text-sm');
            errorDiv.textContent = message;
            this.messagesContainer.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        }

        incrementNotification() {
            this.unreadCount += 1;
            if (!this.notificationBadge) {
                this.notificationBadge = Utils.createElement('div', 'absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-red-600 text-white text-xs font-medium flex items-center justify-center px-1.5');
                this.notificationBadge.setAttribute('aria-label', 'Novas mensagens');
                this.button.appendChild(this.notificationBadge);
            }
            this.notificationBadge.textContent = this.unreadCount;
            
            // Adicionar uma pequena animação para chamar atenção
            this.notificationBadge.animate(
                [
                    { transform: 'scale(0.8)', opacity: 0.8 },
                    { transform: 'scale(1.2)', opacity: 1 },
                    { transform: 'scale(1)', opacity: 1 }
                ], 
                { duration: 300, easing: 'ease-out' }
            );
        }

        clearNotifications() {
            this.unreadCount = 0;
            if (this.notificationBadge) {
                this.notificationBadge.remove();
                this.notificationBadge = null;
            }
        }

        endChat() {
            this.container.innerHTML = '';
            this.renderHeader();
            const endScreen = Utils.createElement('div', 'flex-1 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100');
            endScreen.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12c0 4.418-4.03 8-9 8-1.761 0-3.4-.455-4.8-1.243L3 20l1.243-4.2C3.455 14.4 3 12.761 3 11c0-4.97 3.582-9 8-9s8 4.03 8 9z" />
                </svg>
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">Chat Encerrado</h3>
                <p class="text-gray-600 text-center mb-6">Obrigado por usar nosso suporte! Se precisar de mais ajuda, inicie uma nova conversa.</p>
            `;
            const restartBtn = Utils.createElement(
                'button',
                'px-6 py-3 text-white font-semibold rounded-full shadow-lg transition hover:scale-105',
                { style: `background: linear-gradient(135deg, ${this.config.bubbleColor}, ${this.adjustColor(this.config.bubbleColor, -20)});` }
            );
            restartBtn.textContent = 'Iniciar Nova Conversa';
            restartBtn.onclick = () => this.resetChat();
            endScreen.appendChild(restartBtn);
            this.container.appendChild(endScreen);
        }

        resetChat() {
            // Obter o ID da conversa antes de limpar
            const oldConversationId = Utils.getConversationId();
            
            // Limpar todos os dados de cache relacionados ao chat
            if (oldConversationId) {
                // Usar localStorage.removeItem em vez de Utils.clearCache
                localStorage.removeItem(`chat_history_${oldConversationId}`);
            }
            
            // Remover todos os itens do localStorage relacionados ao chat
            localStorage.removeItem('chat_conversation_id');
            localStorage.removeItem('chat_initialized');
            localStorage.removeItem('chat_last_message');
            
            // Manter as informações do usuário para não pedir novamente
            this.userInfo = Utils.getCache('chat_user_info');
            
            // Reiniciar o objeto
            this.isInitialized = false;
            this.chatUIRendered = false;
            this.messages.clear();
            this.clearNotifications();
            
            // Redefinir o estado do fluxo de chat
            this.inFlowMode = false;
            this.currentNode = null;
            this.flowHistory = [];
            
            // Limpar a interface se o container existir
            if (this.container) {
                this.container.innerHTML = '';
                this.renderHeader();
                
                console.log('Chat reiniciado com sucesso. Todas as informações da conversa anterior foram removidas.');
                
                // Se temos um fluxo de chat disponível, inicie-o, caso contrário mostre o formulário de usuário
                if (this.chatFlow && this.chatFlow.nodes && this.chatFlow.nodes.length > 0) {
                    this.startChatFlow();
                } else {
                    this.renderUserForm();
                }
            } else {
                console.error('Container não encontrado ao tentar resetar o chat');
                // Se o container não existir, tentar renderizá-lo novamente
                this.renderChat();
            }
        }

        async loadHistory() {
            const conversationId = Utils.getConversationId();
            if (!conversationId) {
                console.log("No conversation ID found, skipping history load.");
                return;
            }

            console.log(`Loading history for conversation: ${conversationId}`);
            
            // Mostrar loading apenas durante a requisição
            const showLoading = () => {
                if (this.loadingIndicator) {
                    this.loadingIndicator.style.display = 'block';
                    if (this.messagesContainer) {
                        this.messagesContainer.innerHTML = '';
                        this.messagesContainer.appendChild(this.loadingIndicator);
                    }
                }
            };
            
            const hideLoading = () => {
                if (this.loadingIndicator) {
                    this.loadingIndicator.style.display = 'none';
                }
            };
            
            try {
                showLoading();
                this.messages.clear();
                
                const response = await fetch(
                    `${CONSTANTS.CHAT_SERVER}/api/chat/history?conversation_id=${conversationId}`
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        console.log("No history found for this conversation (404).");
                        // Tentar restaurar do localStorage como fallback
                        this.restoreMessagesFromLocalStorage();
                        return;
                    } else {
                        console.error(`Error fetching history: ${response.status}`, await response.text());
                        this.showError("Falha ao carregar histórico.");
                        // Tentar restaurar do localStorage como fallback
                        this.restoreMessagesFromLocalStorage();
                        return;
                    }
                }

                const data = await response.json();
                console.log('Resposta completa da API:', JSON.stringify(data, null, 2));
                
                // CORREÇÃO IMPORTANTE: A API retorna um objeto com um array 'content' contendo as mensagens
                // Não um array de mensagens diretamente
                let historyMessages = [];
                
                if (data.content && Array.isArray(data.content)) {
                    // Caso 1: A API retornou um objeto com array 'content'
                    console.log('Encontrado array content com mensagens');
                    historyMessages = data.content;
                } else if (data.messages && Array.isArray(data.messages)) {
                    // Caso 2: A API retornou um objeto com array 'messages'
                    console.log('Encontrado array messages com mensagens');
                    historyMessages = data.messages;
                } else if (Array.isArray(data)) {
                    // Caso 3: A API retornou um array diretamente
                    console.log('API retornou um array diretamente');
                    historyMessages = data;
                } else {
                    // Caso 4: Estrutura desconhecida, tentar encontrar as mensagens
                    console.log('Estrutura desconhecida, procurando por mensagens...');
                    if (data.id && data.conversation_id) {
                        // Parece ser um único objeto de conversa
                        if (data.content && Array.isArray(data.content)) {
                            historyMessages = data.content;
                            console.log('Encontrado array content em objeto de conversa');
                        } else {
                            // Pode ser que o próprio objeto seja a conversa com as mensagens dentro do content
                            console.log('Objeto de conversa encontrado, verificando conteúdo:', data);
                            
                            // Se o objeto content não for um array, mas contiver as mensagens diretamente
                            if (data.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
                                // Tentar extrair as mensagens do objeto content
                                const extractedMessages = [];
                                for (const key in data.content) {
                                    if (data.content[key] && typeof data.content[key] === 'object') {
                                        const msg = data.content[key];
                                        if (msg.text || msg.message || msg.content) {
                                            extractedMessages.push(msg);
                                        }
                                    }
                                }
                                
                                if (extractedMessages.length > 0) {
                                    historyMessages = extractedMessages;
                                    console.log(`Encontradas ${extractedMessages.length} mensagens no objeto content`);
                                }
                            }
                        }
                    }
                }
                
                console.log(`Processando ${historyMessages.length} mensagens do histórico.`);
                
                if (historyMessages.length > 0) {
                    console.log('Estrutura da primeira mensagem:', JSON.stringify(historyMessages[0], null, 2));
                    
                    // Salvar no localStorage para garantir persistência
                    const messagesStorageKey = `all_messages_${Utils.getConversationId()}`;
                    localStorage.setItem(messagesStorageKey, JSON.stringify(historyMessages));
                    console.log('✨ Mensagens salvas no localStorage para garantir persistência');
                    
                    // Processar cada mensagem do array
                    historyMessages.forEach(msg => {
                        console.log('Processando mensagem:', msg);
                        
                        // Verificar se a mensagem já tem o formato correto (com campo text e type)
                        if (msg.text && typeof msg.text === 'string' && msg.type) {
                            console.log(`Adicionando mensagem já formatada: ${msg.id} (${msg.type})`);
                            this.addMessage(msg, true);
                        } else {
                            console.warn('Mensagem em formato não reconhecido, tentando adaptar...', msg);
                            
                            // Extrair texto da mensagem de várias fontes possíveis
                            let messageText = '';
                            if (msg.text && typeof msg.text === 'string') {
                                messageText = msg.text;
                            } else if (msg.message && typeof msg.message === 'string') {
                                messageText = msg.message;
                            } else if (msg.content && typeof msg.content === 'string') {
                                messageText = msg.content;
                            } else if (Array.isArray(msg.content)) {
                                // Se content for um array, pode conter as mensagens reais
                                console.log('Encontrado array dentro da mensagem, processando submensagens...');
                                msg.content.forEach(subMsg => {
                                    if (subMsg && typeof subMsg === 'object') {
                                        const subFormattedMsg = {
                                            id: subMsg.id || Utils.generateId(),
                                            type: subMsg.type || subMsg.sender_type || 'client',
                                            text: subMsg.text || subMsg.message || '',
                                            timestamp: subMsg.timestamp || subMsg.created_at || new Date().toISOString()
                                        };
                                        
                                        if (subFormattedMsg.text && typeof subFormattedMsg.text === 'string' && subFormattedMsg.text.trim()) {
                                            console.log(`Adicionando submensagem: ${subFormattedMsg.id} (${subFormattedMsg.type})`);
                                            this.addMessage(subFormattedMsg, true);
                                        }
                                    }
                                });
                                return; // Pular o resto do processamento desta mensagem
                            }
                            
                            // Tentar adaptar outros formatos de mensagem
                            const formattedMsg = {
                                id: msg.id || Utils.generateId(),
                                type: msg.type || msg.sender_type || (msg.sender_id === 1 ? 'admin' : 'client'),
                                text: messageText,
                                timestamp: msg.timestamp || msg.created_at || new Date().toISOString()
                            };
                            
                            if (formattedMsg.text && typeof formattedMsg.text === 'string' && formattedMsg.text.trim()) {
                                console.log(`Adicionando mensagem adaptada: ${formattedMsg.id} (${formattedMsg.type})`);
                                this.addMessage(formattedMsg, true);
                            } else {
                                console.warn(`Ignorando mensagem sem texto válido: ${formattedMsg.id}`);
                            }
                        }
                    });
                    console.log("History messages added to chat.");
                    
                    // Esconder o indicador de carregamento
                    hideLoading();
                } else {
                    console.log("History is empty.");
                    // Tentar restaurar do localStorage como fallback
                    this.restoreMessagesFromLocalStorage();
                    
                    // Esconder o indicador de carregamento
                    hideLoading();
                }
                
                this.scrollToBottom();

            } catch (error) {
                console.error('Failed to load or process chat history:', error);
                this.showError("Falha ao carregar histórico.");
                // Tentar restaurar do localStorage como fallback
                this.restoreMessagesFromLocalStorage();
            } finally {
                // Esconder o indicador de carregamento quando terminar
                hideLoading();
            }
        }

        async restoreChat() {
            // Iniciar o carregamento imediatamente
            const startTime = performance.now();
            
            if (!this.chatUIRendered) {
                this.renderChatUI();
            }
            
            const conversationId = Utils.getConversationId();
            if (!conversationId) {
                console.log('Sem ID de conversa, não é possível restaurar.');
                return;
            }
            
            console.log('Restaurando chat para conversa:', conversationId);
            
            try {
                // Primeiro verificar se a conversa existe no servidor
                const conversationExists = await ApiClient.checkConversationExists(conversationId);
                if (!conversationExists) {
                    console.log('Conversa não existe ao restaurar, reiniciando o chat...');
                    this.showError('A conversa anterior não existe mais. Iniciando uma nova sessão.');
                    this.resetChat(); // Reinicia completamente o chat
                    return;
                }
                
                // Carregar histórico da API primeiro (prioridade)
                await this.loadHistory();
                
                // Se não temos mensagens após carregar da API, tentar usar o cache como fallback
                if (this.messages.size === 0) {
                    console.log('Sem mensagens da API, tentando usar cache como fallback');
                    const cacheKey = `chat_history_${conversationId}`;
                    const cachedMessages = Utils.getCache(cacheKey) || [];
                    
                    if (cachedMessages.length > 0) {
                        console.log(`Encontradas ${cachedMessages.length} mensagens no cache`);
                        cachedMessages.forEach((msg) => {
                            if (!this.messages.has(msg.id)) {
                                this.addMessage(msg, true);
                            }
                        });
                        this.scrollToBottom();
                    } else {
                        console.log('Cache vazio, sem mensagens para restaurar');
                    }
                }
                
                // Garantir tempo mínimo de carregamento para evitar flash do spinner
                const elapsedTime = performance.now() - startTime;
                const minLoadTime = 500; // Tempo mínimo de 500ms para mostrar o loading
                
                if (elapsedTime < minLoadTime) {
                    await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
                }
                
                // Esconder o indicador de carregamento
                if (this.loadingIndicator) {
                    this.loadingIndicator.style.display = 'none';
                }
            } catch (error) {
                console.error('Erro ao restaurar chat:', error);
                this.showError('Erro ao restaurar conversa');
            }
        }
        
        // Métodos para o fluxo de chat
        startChatFlow() {
            console.log('Iniciando fluxo de chat', this.chatFlow);
            
            if (!this.chatFlow || !this.chatFlow.nodes || this.chatFlow.nodes.length === 0) {
                console.error('Não há fluxo de chat disponível');
                this.renderUserForm();
                return;
            }
            
            this.inFlowMode = true;
            this.flowHistory = [];
            
            // Verificar a estrutura dos nós
            console.log('Nós disponíveis:', this.chatFlow.nodes);
            
            // Encontrar o primeiro nó
            let firstNode = null;
            
            // Tenta encontrar um nó com id 'start'
            firstNode = this.chatFlow.nodes.find(node => node.id === 'start');
            
            // Se não encontrar, tenta encontrar um nó com type 'botMessage'
            if (!firstNode) {
                firstNode = this.chatFlow.nodes.find(node => node.type === 'botMessage');
            }
            
            // Se ainda não encontrar, pega o primeiro nó
            if (!firstNode && this.chatFlow.nodes.length > 0) {
                firstNode = this.chatFlow.nodes[0];
            }
            
            if (!firstNode) {
                console.error('Não foi possível encontrar o primeiro nó do fluxo');
                this.renderUserForm();
                return;
            }
            
            console.log('Primeiro nó encontrado:', firstNode);
            this.currentNode = firstNode;
            this.renderFlowUI();
        }
        
        renderFlowUI() {
            // Definir que estamos em modo de fluxo antes de renderizar a UI
            this.inFlowMode = true;
            
            // Usar o mesmo layout do chat normal
            this.renderChatUI();
            
            // Garantir que o indicador de loading esteja escondido durante o fluxo
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            
            // Garantir que o input de mensagem esteja oculto durante o fluxo
            if (this.inputContainer) {
                this.inputContainer.style.display = 'none';
            }
            
            // Adicionar um indicador de assistente virtual no rodapé do chat
            const footerContainer = document.createElement('div');
            footerContainer.className = 'flex items-center justify-center border-t border-border p-3 bg-background';
            
            const botIcon = document.createElement('div');
            botIcon.className = 'w-6 h-6 flex items-center justify-center rounded-full bg-primary mr-2';
            botIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>';
            
            const footerText = document.createElement('div');
            footerText.className = 'text-xs text-muted-foreground';
            footerText.textContent = 'Assistente virtual';
            
            footerContainer.appendChild(botIcon);
            footerContainer.appendChild(footerText);
            
            // Adicionar o rodapé ao container principal
            this.container.appendChild(footerContainer);
            
            // Adicionar um log para debug
            console.log('Renderizando fluxo de chat com nó atual:', this.currentNode);
            
            // Processar o nó atual após um pequeno delay para garantir que o DOM esteja pronto
            setTimeout(() => {
                this.processCurrentNode();
            }, 100);
        }
        
        processCurrentNode() {
            if (!this.currentNode) {
                console.error('Nó atual não definido');
                return;
            }
            
            // Adicionar o nó atual ao histórico
            this.flowHistory.push(this.currentNode.id);
            
            console.log('Processando nó:', this.currentNode);
            
            // Verificar se o nó tem um tipo definido
            const nodeType = this.currentNode.type || 
                             (this.currentNode.data && this.currentNode.data.type);
            
            console.log('Tipo do nó:', nodeType);
            
            // Verificar se o nó tem dados
            if (!this.currentNode.data) {
                console.error('Nó sem dados:', this.currentNode);
                // Não encaminhar automaticamente para o atendente
                return;
            }
            
            switch (nodeType) {
                case 'botMessage':
                case 'message':
                    this.renderBotMessage(this.currentNode);
                    break;
                case 'choices':
                case 'choice':
                    this.renderChoices(this.currentNode);
                    break;
                case 'attendant':
                case 'end':
                    this.handleAttendantNode();
                    break;
                default:
                    console.error('Tipo de nó desconhecido:', nodeType);
                    // Tentar processar com base nos dados do nó
                    if (this.currentNode.data.message || this.currentNode.data.label) {
                        this.renderBotMessage(this.currentNode);
                    } else if (this.currentNode.data.choices) {
                        this.renderChoices(this.currentNode);
                    } else {
                        // Não encaminhar automaticamente para o atendente
                        console.log('Nó sem conteúdo reconhecível, permanecendo no estado atual');
                    }
            }
        }
        
        renderBotMessage(node) {
            // Priorizar a mensagem sobre o label
            const message = node.data.message || (node.data.message === '' ? '' : node.data.content || 'Mensagem sem conteúdo');
            console.log('Renderizando mensagem do bot:', message);
            
            // Se a mensagem estiver vazia, não exibir nada e seguir para o próximo nó
            if (message === '') {
                console.log('Mensagem vazia, avançando para o próximo nó');
                setTimeout(() => {
                    this.findNextNode(node.id);
                }, 100);
                return;
            }
            
            // Formatar a data corretamente
            const now = new Date();
            const formattedDate = now.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const botMessage = {
                id: `flow-${node.id}-${Date.now()}`,
                sender_type: 'admin', // Alterado para admin em vez de bot
                sender_id: 1,
                sender_name: 'Atendente',
                message: message,
                created_at: formattedDate,
                is_read: true
            };
            
            // Adicionar a mensagem ao container usando a função existente
            this.addMessage(botMessage, false);
            this.scrollToBottom();
            
            // Encontrar a próxima conexão após um pequeno delay para simular digitação
            setTimeout(() => {
                this.findNextNode(node.id);
            }, 1000);
        }
        
        renderChoices(node) {
            // Criar uma mensagem do bot com a pergunta
            const question = node.data.label || node.data.message || node.data.content || 'Escolha uma opção:';
            console.log('Renderizando escolhas com pergunta:', question);
            
            // Formatar a data corretamente
            const now = new Date();
            const formattedDate = now.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const botMessage = {
                id: `flow-${node.id}-question-${Date.now()}`,
                sender_type: 'admin',
                sender_id: 1,
                sender_name: 'Atendente',
                message: question,
                created_at: formattedDate,
                is_read: true
            };
            
            // Adicionar a mensagem de pergunta ao container
            this.addMessage(botMessage, false);
            this.scrollToBottom();
            
            // Verificar se temos escolhas
            let choices = [];
            
            // Tentar obter as escolhas de diferentes formatos de dados
            if (Array.isArray(node.data.choices)) {
                choices = node.data.choices;
            } else if (Array.isArray(node.data.options)) {
                choices = node.data.options;
            } else if (typeof node.data.choices === 'object' && !Array.isArray(node.data.choices)) {
                // Se choices for um objeto, tentar extrair as opções
                choices = Object.values(node.data.choices);
            }
            
            console.log('Opções disponíveis:', choices);
            
            if (choices.length === 0) {
                console.error('Nó de escolhas sem opções');
                setTimeout(() => this.findNextNode(node.id), 1000);
                return;
            }
            
            // Criar um container para as opções com layout de grid/flex para múltiplas opções
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'flex flex-wrap gap-2 mt-2 w-full max-w-[95%]';
            
            // Adicionar os botões de escolha com estilo semelhante ao da imagem de referência
            choices.forEach((choice, index) => {
                // Se a escolha for um objeto, extrair o texto
                const choiceText = typeof choice === 'object' ? (choice.text || choice.label || `Opção ${index+1}`) : choice;
                
                const button = document.createElement('button');
                button.className = 'px-4 py-2 text-sm border border-border rounded-md transition-colors hover:bg-muted mb-2';
                
                // Adicionar o texto da opção diretamente na bolha
                button.textContent = choiceText;
                
                // Definir estilo base
                button.style.backgroundColor = '#fff';
                button.style.color = '#333';
                button.style.borderColor = '#ddd';
                
                // Adicionar efeito de hover
                button.onmouseover = () => {
                    button.style.borderColor = this.config.bubbleColor;
                    button.style.color = this.config.bubbleColor;
                };
                button.onmouseout = () => {
                    button.style.borderColor = '#ddd';
                    button.style.color = '#333';
                };
                
                button.onclick = () => this.handleChoiceSelection(node.id, index, choiceText);
                
                optionsDiv.appendChild(button);
            });
            
            // Criar um elemento de mensagem para conter as opções
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'message-item flex justify-start w-full my-2';
            optionsContainer.appendChild(optionsDiv);
            
            // Adicionar as opções ao container de mensagens
            this.messagesContainer.appendChild(optionsContainer);
            this.scrollToBottom();
        }
        
        handleChoiceSelection(nodeId, choiceIndex, choiceText) {
            console.log(`Escolha selecionada: ${choiceText} (${choiceIndex}) do nó ${nodeId}`);
            
            // Formatar a data corretamente
            const now = new Date();
            const formattedDate = now.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Adicionar a resposta do usuário como uma mensagem
            const userMessage = {
                id: `flow-${nodeId}-response-${choiceIndex}-${Date.now()}`,
                sender_type: 'client', // Alterado para client em vez de user
                sender_id: this.user ? this.user.id : 0,
                sender_name: this.user ? this.user.name : 'Você',
                message: choiceText,
                created_at: formattedDate,
                is_read: true
            };
            
            // Adicionar a mensagem do usuário ao container
            this.addMessage(userMessage, false);
            this.scrollToBottom();
            
            // Pequeno atraso antes de processar o próximo nó
            setTimeout(() => {
                this.findNextNodeFromChoice(nodeId, choiceIndex);
            }, 800);
        }
        
        findNextNodeFromChoice(nodeId, choiceIndex) {
            console.log(`Buscando próximo nó a partir da escolha ${choiceIndex} do nó ${nodeId}`);
            
            // Verificar se temos edges
            if (!this.chatFlow.edges || this.chatFlow.edges.length === 0) {
                console.error('Não há conexões no fluxo de chat');
                // Continuar no nó atual em vez de encerrar o fluxo
                return;
            }
            
            // Primeiro tenta encontrar pela handle específica da escolha
            let edge = this.chatFlow.edges.find(e => 
                e.source === nodeId && 
                e.sourceHandle === `choice-${choiceIndex}`
            );
            
            // Se não encontrar, tenta encontrar pelo índice da escolha
            if (!edge) {
                edge = this.chatFlow.edges.find(e => 
                    e.source === nodeId && 
                    e.data && e.data.choiceIndex === choiceIndex
                );
            }
            
            // Se ainda não encontrar, tenta qualquer conexão saindo deste nó
            if (!edge) {
                edge = this.chatFlow.edges.find(e => e.source === nodeId);
            }
            
            // Se não encontrar, tenta com source.id
            if (!edge) {
                edge = this.chatFlow.edges.find(e => e.source && e.source.id === nodeId);
            }
            
            // Se não encontrar, tenta com sourceId
            if (!edge) {
                edge = this.chatFlow.edges.find(e => e.sourceId === nodeId);
            }
            
            if (edge) {
                console.log('Conexão encontrada:', edge);
                
                // Verificar diferentes formatos de target
                const targetId = edge.target || (edge.target && edge.target.id) || edge.targetId;
                
                if (targetId) {
                    const nextNode = this.chatFlow.nodes.find(n => n.id === targetId);
                    if (nextNode) {
                        console.log('Próximo nó encontrado:', nextNode);
                        this.currentNode = nextNode;
                        this.processCurrentNode();
                    } else {
                        console.error('Nó alvo não encontrado:', targetId);
                        // Continuar no nó atual em vez de encerrar o fluxo
                    }
                } else {
                    console.error('Conexão sem alvo válido:', edge);
                    // Continuar no nó atual em vez de encerrar o fluxo
                }
            } else {
                console.error('Nenhuma conexão encontrada para a escolha:', choiceIndex);
                // Continuar no nó atual em vez de encerrar o fluxo
            }
        }
        
        findNextNode(currentNodeId) {
            console.log('Buscando próximo nó a partir de:', currentNodeId);
            
            // Verificar se temos edges
            if (!this.chatFlow.edges || this.chatFlow.edges.length === 0) {
                console.error('Não há conexões no fluxo de chat');
                // Verificar se o nó atual é do tipo attendant ou end
                const nodeType = this.currentNode.type || (this.currentNode.data && this.currentNode.data.type);
                if (nodeType === 'attendant' || nodeType === 'end') {
                    this.handleAttendantNode();
                }
                return;
            }
            
            // Encontrar a próxima conexão (edge) a partir do nó atual
            console.log('Conexões disponíveis:', this.chatFlow.edges);
            
            // Verificar diferentes formatos de conexão
            let edge = this.chatFlow.edges.find(e => e.source === currentNodeId);
            
            // Se não encontrar, tenta com source.id
            if (!edge) {
                edge = this.chatFlow.edges.find(e => e.source && e.source.id === currentNodeId);
            }
            
            // Se não encontrar, tenta com sourceId
            if (!edge) {
                edge = this.chatFlow.edges.find(e => e.sourceId === currentNodeId);
            }
            
            if (edge) {
                console.log('Conexão encontrada:', edge);
                
                // Verificar diferentes formatos de target
                const targetId = edge.target || (edge.target && edge.target.id) || edge.targetId;
                
                if (targetId) {
                    const nextNode = this.chatFlow.nodes.find(n => n.id === targetId);
                    if (nextNode) {
                        console.log('Próximo nó encontrado:', nextNode);
                        // Pequeno atraso para simular digitação
                        setTimeout(() => {
                            this.currentNode = nextNode;
                            this.processCurrentNode();
                        }, 1000);
                    } else {
                        console.error('Nó alvo não encontrado:', targetId);
                        // Verificar se o nó atual é do tipo attendant ou end
                        const nodeType = this.currentNode.type || (this.currentNode.data && this.currentNode.data.type);
                        if (nodeType === 'attendant' || nodeType === 'end') {
                            this.handleAttendantNode();
                        }
                    }
                } else {
                    console.error('Conexão sem alvo válido:', edge);
                    // Verificar se o nó atual é do tipo attendant ou end
                    const nodeType = this.currentNode.type || (this.currentNode.data && this.currentNode.data.type);
                    if (nodeType === 'attendant' || nodeType === 'end') {
                        this.handleAttendantNode();
                    }
                }
            } else {
                console.error('Nenhuma conexão encontrada a partir do nó:', currentNodeId);
                // Verificar se o nó atual é do tipo attendant ou end
                const nodeType = this.currentNode.type || (this.currentNode.data && this.currentNode.data.type);
                if (nodeType === 'attendant' || nodeType === 'end') {
                    this.handleAttendantNode();
                }
            }
        }
        
        handleAttendantNode() {
            console.log('Processando nó de atendente');
            
            // Formatar a data corretamente
            const now = new Date();
            const formattedDate = now.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Exibir mensagem informando que será redirecionado para um atendente
            const attendantMessage = {
                id: `flow-attendant-${Date.now()}`,
                sender_type: 'admin',
                sender_id: 1,
                sender_name: 'Atendente',
                message: 'Você será conectado a um atendente. Por favor, aguarde um momento.',
                created_at: formattedDate,
                is_read: true
            };
            
            // Adicionar a mensagem ao container
            this.addMessage(attendantMessage, false);
            this.scrollToBottom();
            
            // Após um breve atraso, mostrar o formulário de usuário
            setTimeout(() => {
                this.handleFlowEnd();
            }, 2000);
        }
        
        handleFlowEnd() {
            console.log('Finalizando fluxo de chat');
            
            // Adicionar uma mensagem final antes de encerrar o fluxo
            const finalMessage = {
                id: `flow-end-${Date.now()}`,
                sender_type: 'admin',
                sender_id: 1,
                sender_name: 'Atendente',
                message: 'Aguarde um momento enquanto conectamos você a um atendente...',
                created_at: new Date().toISOString(),
                is_read: true
            };
            
            // Adicionar a mensagem final ao container
            this.addMessage(finalMessage, false);
            this.scrollToBottom();
            
            // Finalizar o fluxo de chat
            this.inFlowMode = false;
            
            // Pequeno atraso para mostrar a mensagem final antes de mudar a interface
            setTimeout(() => {
                if (this.userInfo && this.isInitialized) {
                    // Se o usuário já está inicializado, mostrar a interface de chat normal
                    this.renderChatUI();
                    
                    // Garantir que o input esteja visível após renderizar a UI
                    if (this.inputContainer) {
                        this.inputContainer.style.display = 'block';
                    }
                } else {
                    // Caso contrário, mostrar o formulário de usuário
                    this.renderUserForm();
                }
            }, 2000);
        }
    }

    function initChatWidget() {
        if (document.getElementById('chat-widget')) return;
        const host = document.createElement('div');
        host.id = 'chat-widget';
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });
        new Chat(shadow);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatWidget);
    } else {
        initChatWidget();
    }
})();