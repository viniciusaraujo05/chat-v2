(() => {
    // Configurações constantes
    const CONSTANTS = {
        CHAT_SERVER: 'http://localhost',
        WS_SERVER: 'ws://localhost:8080/app/7vrgi25mdfojb94mbz3v',
        TAILWIND_CSS: 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
        DEFAULT_CONFIG: {
            position: 'right',
            title: 'Chat de Suporte',
            bubbleColor: '#4F46E5',
            welcomeMessage: 'Olá {name}! Como posso ajudar você hoje?',
            cacheTTL: 24 * 60 * 60 * 1000,
        },
    };

    // Utilitários
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
                // Retorna true apenas se o status for 200 (OK), indicando que a conversa existe
                return response.status === 200;
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
    };

    // WebSocket Manager
    class WebSocketManager {
        constructor(chat) {
            this.chat = chat;
            this.socket = null;
            this.isSubscribed = false;
            this.connect();
        }

        connect() {
            if (this.socket?.readyState === WebSocket.OPEN) return;

            this.socket = new WebSocket(CONSTANTS.WS_SERVER);
            this.socket.onopen = () => this.subscribeToChannel();
            this.socket.onmessage = (event) => this.handleMessage(event.data);
            this.socket.onclose = () => setTimeout(() => this.connect(), 1000);
            this.socket.onerror = (error) => console.error('WebSocket error:', error);
        }

        subscribeToChannel() {
            if (this.isSubscribed) return;
            this.socket.send(JSON.stringify({
                event: 'pusher:subscribe',
                data: { channel: `chat.${Utils.getConversationId()}` },
            }));
            this.isSubscribed = true;
        }

        handleMessage(data) {
            console.log('WebSocket message received:', data);
            try {
                const parsed = JSON.parse(data);
                if (parsed.event === 'App\\Events\\MessageCreated') {
                    const { message } = JSON.parse(parsed.data);
                    console.log('Parsed message:', message);

                    if (this.chat.messages.has(message.id)) {
                        console.log('Ignoring duplicate message:', message.id);
                        return;
                    }

                    if (message.type !== 'client') {
                        this.chat.addMessage(message, true);
                        if (!this.chat.isOpen) this.chat.incrementNotification();
                        this.updateCache(message);
                    }
                } else if (parsed.event === 'UserTyping') {
                    const { isTyping, userInfo } = JSON.parse(parsed.data);
                    if (!userInfo) this.chat.showTyping(isTyping);
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
            this.unreadCount = 0;
            this.notificationBadge = null;
            this.isInitialized = Utils.getCache('chat_initialized') === true;
            this.chatUIRendered = false;
            this.init();
        }

        async init() {
            this.loadStyles();
            this.renderButton();
            this.renderChat();
            this.ws = new WebSocketManager(this);
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
                    .notification-badge { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; background-color: #EF4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }
                    .chat-bubble-client { background: linear-gradient(135deg, ${this.config.bubbleColor}, ${this.adjustColor(this.config.bubbleColor, -20)}); color: white; }
                    .chat-bubble-admin { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #333; }
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
            this.button = Utils.createElement(
                'button',
                `fixed bottom-6 ${position} w-16 h-16 rounded-full text-white flex items-center justify-center shadow-xl hover:scale-110 transform transition-transform`,
                { style: `background-color: ${this.config.bubbleColor}; z-index: 10000;` }
            );
            this.button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.761 0-3.4-.455-4.8-1.243L3 20l1.243-4.2C3.455 14.4 3 12.761 3 11c0-4.97 3.582-9 8-9s8 4.03 8 9z" />
                </svg>
            `;
            this.button.onclick = () => this.toggle();
            this.root.appendChild(this.button);
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
                    style: `width: ${width}; height: ${height}; z-index: 10000; max-width: 100vw; ${isMobile ? 'margin: 0 0.5rem' : ''}`
                }
            );

            this.renderHeader();
            this.userInfo && this.isInitialized ? this.renderChatUI() : this.renderUserForm();
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
            this.container.appendChild(this.messagesContainer);

            this.typingIndicator = Utils.createElement('div', 'px-2 sm:px-4 pb-2 text-sm text-gray-500 hidden', { id: 'typing' });
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

            const footer = Utils.createElement('footer', 'p-2 sm:p-4 bg-gray-50');
            footer.innerHTML = `
                <form class="flex gap-2">
                    <input type="text" class="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-${this.config.bubbleColor}-300 text-sm text-black" placeholder="Digite sua mensagem...">
                    <button type="submit" class="p-2 sm:p-3 text-white rounded-full transition hover:opacity-90" style="background-color: ${this.config.bubbleColor}; min-width: 48px;">
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

        async handleMessageSubmit(e) {
            e.preventDefault();
            const input = e.target.querySelector('input');
            const text = input.value.trim();
            if (!text) return;

            // Verificar se a conversa existe antes de enviar a mensagem
            const conversationExists = await ApiClient.checkConversationExists(Utils.getConversationId());
            if (!conversationExists) {
                console.log('Conversa não existe mais, reiniciando o chat do zero...');
                this.showError('A conversa anterior não existe mais. Iniciando uma nova sessão.');
                this.resetChat(); // Reinicia completamente o chat
                return;
            }

            input.value = '';
            const tempId = Utils.generateId();
            const tempMessage = { id: tempId, text, type: 'client', timestamp: new Date().toISOString(), isTemp: true };
            if (!this.messages.has(tempId)) {
                this.addMessage(tempMessage, false);
            }
            try {
                const response = await ApiClient.postMessage(text, 'client', this.userInfo);
                if (response?.message && !this.messages.has(response.message.id)) {
                    this.replaceMessage(tempId, response.message);
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                this.showError('Falha ao enviar mensagem.');
                this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`)?.remove();
                this.messages.delete(tempId);
            }
        }

        async handleTyping() {
            const input = this.container.querySelector('input');
            const isTyping = !!input?.value;

            if (this.typingTimeout) clearTimeout(this.typingTimeout);

            if (isTyping) {
                await ApiClient.broadcastTyping(true, this.userInfo);
                this.typingTimeout = setTimeout(async () => {
                    await ApiClient.broadcastTyping(false, this.userInfo);
                }, 1000);
            } else {
                await ApiClient.broadcastTyping(false, this.userInfo);
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

        addMessage(msg, fromServer = false) {
            if (this.messages.has(msg.id)) {
                console.log('Message already exists, skipping:', msg.id, msg.text);
                return;
            }

            const welcomeText = Utils.replacePlaceholders(this.config.welcomeMessage, this.userInfo || {});
            if (msg.type === 'admin' && msg.text === welcomeText) {
                const existingWelcome = Array.from(this.messages.values()).find(
                    m => m.type === 'admin' && m.text === welcomeText
                );
                if (existingWelcome) {
                    console.log('Merging duplicate welcome message:', msg.id, 'with existing:', existingWelcome.id);
                    this.replaceMessage(existingWelcome.id, {
                        ...existingWelcome,
                        timestamp: msg.timestamp || existingWelcome.timestamp,
                    });
                    return;
                }
            }

            this.messages.set(msg.id, msg);

            const messageDiv = Utils.createElement(
                'div',
                `flex ${msg.type === 'client' ? 'justify-end' : 'justify-start'} mb-2`,
                { 'data-message-id': msg.id }
            );
            const bubble = Utils.createElement(
                'div',
                `relative max-w-[80%] p-4 rounded-xl shadow-md ${msg.type === 'client' ? 'chat-bubble-client' : 'chat-bubble-admin'} text-sm`,
            );

            bubble.textContent = msg.text;

            const time = Utils.createElement('div', 'text-xs opacity-70 mt-1 text-right');
            time.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            bubble.appendChild(time);

            const arrow = Utils.createElement(
                'div',
                `absolute w-3 h-3 transform rotate-45 ${msg.type === 'client' ? '-right-1.5 top-1/2 -translate-y-1/2' : '-left-1.5 top-1/2 -translate-y-1/2'}`,
            );
            arrow.className += ` ${msg.type === 'client' ? 'bg-gradient-to-br from-[${this.config.bubbleColor}] to-[${this.adjustColor(this.config.bubbleColor, -20)}]' : 'bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb]'}`;
            bubble.appendChild(arrow);

            messageDiv.appendChild(bubble);
            this.messagesContainer.appendChild(messageDiv);
            this.scrollToBottom();

            if (!fromServer || msg.type !== 'client') {
                const cacheKey = `chat_history_${Utils.getConversationId()}`;
                const cached = Utils.getCache(cacheKey) || [];
                if (!cached.some(m => m.id === msg.id)) {
                    cached.push(msg);
                    Utils.setCache(cacheKey, cached);
                }
            }
        }

        replaceMessage(tempId, message) {
            const tempMsg = this.messagesContainer.querySelector(`[data-message-id="${tempId}"]`);
            if (tempMsg && this.messages.get(tempId)?.isTemp) {
                tempMsg.remove();
                this.messages.delete(tempId);
            }
            if (!this.messages.has(message.id)) {
                this.addMessage(message, true);
            }
        }

        scrollToBottom() {
            requestAnimationFrame(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            });
        }

        showTyping(isTyping) {
            requestAnimationFrame(() => {
                this.typingIndicator.classList.toggle('hidden', !isTyping);
            });
        }

        toggle() {
            this.isOpen = !this.isOpen;
            this.container.classList.toggle('opacity-0', !this.isOpen);
            this.container.classList.toggle('translate-y-4', !this.isOpen);
            this.container.classList.toggle('pointer-events-none', !this.isOpen);
            if (this.isOpen && this.isInitialized) {
                this.checkAndLoadHistory();
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
                this.notificationBadge = Utils.createElement('div', 'notification-badge');
                this.button.appendChild(this.notificationBadge);
            }
            this.notificationBadge.textContent = this.unreadCount;
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
                'px-6 py-3 text-white font-semibold rounded-full shadow-lg transition-all duration-200 hover:scale-105',
                { style: `background: linear-gradient(135deg, ${this.config.bubbleColor}, ${this.adjustColor(this.config.bubbleColor, -20)});` }
            );
            restartBtn.textContent = 'Iniciar Nova Conversa';
            restartBtn.onclick = () => this.resetChat();
            endScreen.appendChild(restartBtn);
            this.container.appendChild(endScreen);
        }

        resetChat() {
            localStorage.removeItem('chat_conversation_id');
            localStorage.removeItem('chat_user_info');
            localStorage.removeItem('chat_initialized');
            Utils.setCache(`chat_history_${Utils.getConversationId()}`, []);
            this.userInfo = null;
            this.isInitialized = false;
            this.chatUIRendered = false;
            this.messages.clear();
            this.clearNotifications();
            this.container.innerHTML = '';
            this.renderHeader();
            this.renderUserForm();
        }

        async loadHistory() {
            try {
                const messages = await ApiClient.getHistory();
                this.messagesContainer.innerHTML = '';
                this.messages.clear();
                messages.forEach((msg) => {
                    if (!this.messages.has(msg.id)) {
                        this.addMessage(msg, true);
                    }
                });
                this.scrollToBottom();
            } catch (error) {
                console.error('Erro ao carregar histórico:', error);
                this.showError('Erro ao carregar o histórico.');
            }
        }

        async restoreChat() {
            const conversationExists = await ApiClient.checkConversationExists(Utils.getConversationId());
            if (!conversationExists) {
                console.log('Conversa não existe ao restaurar, reiniciando o chat...');
                this.resetChat();
                return;
            }

            const cacheKey = `chat_history_${Utils.getConversationId()}`;
            const cachedMessages = Utils.getCache(cacheKey) || [];
            if (!this.chatUIRendered) {
                this.renderChatUI();
            }
            cachedMessages.forEach((msg) => {
                if (!this.messages.has(msg.id)) {
                    this.addMessage(msg, true);
                }
            });
            this.scrollToBottom();
            await this.loadHistory();
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