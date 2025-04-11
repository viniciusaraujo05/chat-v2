import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { usePage } from '@inertiajs/react';
import {
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  NodeTypes,
  ReactFlowProvider,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

// Import components
import BotMessageNode from '@/components/chat-builder/nodes/BotMessageNode';
import ChoicesNode from '@/components/chat-builder/nodes/ChoicesNode';
import AttendantNode from '@/components/chat-builder/nodes/AttendantNode';
import Sidebar from '@/components/chat-builder/sidebar/Sidebar';
import MobileSidebar from '@/components/chat-builder/sidebar/MobileSidebar';
import HeaderControls from '@/components/chat-builder/controls/HeaderControls';

import FlowArea from '@/components/chat-builder/flow/FlowArea';

import { NodeData, ChatFlowConfig } from '@/components/chat-builder/types';

const ChatBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState('Novo Fluxo de Chat');
  const [flowDescription, setFlowDescription] = useState('');
  const [flowId, setFlowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingFlows, setIsFetchingFlows] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [flowConfig, setFlowConfig] = useState<ChatFlowConfig>({ is_active: false, start_flow: null });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [markAsStartFlow, setMarkAsStartFlow] = useState(false);
  const { auth } = usePage().props;

  const addNode = useCallback((type: 'botMessage' | 'choices' | 'attendant') => {
    const maxSequence = nodes.length ? Math.max(...nodes.map(n => n.data.sequence)) : 0;
    const lastNode = nodes[nodes.length - 1];
    const newPosition = lastNode ? { x: lastNode.position.x + 50, y: lastNode.position.y + 80 } : { x: 100, y: 100 };

    const newNode: Node<NodeData> = {
      id: `${type}-${Date.now()}`,
      type,
      position: newPosition,
      data: {
        label: type === 'botMessage' ? 'Nova Mensagem' : type === 'choices' ? 'Novas Escolhas' : 'Chat com Atendente',
        message: type === 'botMessage' ? '' : undefined,
        choices: type === 'choices' ? ['Opção 1'] : undefined,
        sequence: maxSequence + 1,
      },
      selected: true,
    };

    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes, setNodes]);

  const updateNodeData = useCallback((nodeId: string, newData: Partial<NodeData>) => {
    setNodes(nds => nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)));
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
    toast({ title: 'Nó removido', description: 'O nó foi excluído com sucesso' });
  }, [setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const sourceNode = nodes.find(n => n.id === params.source);

    if (!params.source || !params.target) {
      console.error('Source ou target inválidos:', params);
      return;
    }

    const edge: Edge = {
      id: `e-${params.source}-${params.target}-${Date.now()}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      label: sourceNode?.type === 'choices' && params.sourceHandle
        ? sourceNode.data.choices?.[parseInt(params.sourceHandle.split('-')[1])] || 'Escolha'
        : undefined,
    };
    setEdges(eds => [...eds, edge]);
    toast({ title: 'Conexão Criada', description: 'Nós conectados com sucesso!' });
  }, [nodes, setEdges]);

  const saveFlow = useCallback(async () => {
    if (!flowName.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome do fluxo é obrigatório.' });
      return;
    }

    setIsSaving(true);
    const flowData = {
      name: flowName,
      description: flowDescription || null,
      flow_data: JSON.stringify({ nodes, edges }),
    };

    try {
      let response;
      
      // Obtener el botón de guardar para el efecto de confeti localizado
      const saveButton = document.querySelector('#save-flow-button');
      const buttonX = saveButton ? (saveButton.getBoundingClientRect().right / window.innerWidth) - 0.05 : 0.9;
      const buttonY = saveButton ? (saveButton.getBoundingClientRect().top / window.innerHeight) + 0.03 : 0.1;
      
      if (flowId) {
        response = await axios.put(`/api/chat-flows/${flowId}`, flowData, { headers: { Authorization: `Bearer ${auth.token}` } });
        launchConfetti(buttonX, buttonY);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
        toast({ title: 'Fluxo Atualizado', description: 'Alterações salvas com sucesso! 👍' });
      } else {
        response = await axios.post('/api/chat-flows', flowData, { headers: { Authorization: `Bearer ${auth.token}` } });

        const newId = response.data.data.id;
        if (newId && (typeof newId === 'number' || (typeof newId === 'string' && /^\d+$/.test(newId)))) {
          setFlowId(newId.toString());
          console.log('Fluxo criado com ID:', newId);
          // Lanzar confeti localizado en el botón
          launchConfetti(buttonX, buttonY);
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 2000);
        } else {
          console.error('ID inválido retornado pela API:', newId);
          setFlowId(null);
        }
        toast({ title: 'Fluxo Criado', description: 'Novo fluxo salvo com sucesso! 🎉' });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.name?.[0] || 'Erro ao salvar o fluxo.';
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: errorMsg });
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, flowId, flowName, flowDescription]);

  const loadFlow = useCallback(async (id: string | number) => {
    const flowId = id.toString();
    console.log('Tentando carregar fluxo com ID:', flowId, 'tipo:', typeof flowId);
    try {
      if (!flowId) {
        console.error('ID de fluxo inválido:', flowId);
        toast({ variant: 'destructive', title: 'Erro', description: 'ID de fluxo inválido' });
        return;
      }

      const response = await axios.get(`/api/chat-flows/${flowId}`, { headers: { Authorization: `Bearer ${auth.token}` } });

      let flowData;

      // Verificar a estrutura da resposta e extrair os dados corretamente
      if (response.data && response.data.data) {
        // Nova estrutura: dados dentro de response.data.data
        flowData = response.data.data;
      } else if (response.data) {
        // Estrutura antiga: dados diretamente em response.data
        flowData = response.data;
      } else {
        console.error('Formato de resposta inesperado:', response);
        toast({ variant: 'destructive', title: 'Erro no Formato', description: 'Formato de resposta inesperado' });
        return;
      }

      console.log('Flow data extraído:', flowData);

      if (!flowData) {
        console.error('Nenhum dado de fluxo recebido para o ID:', flowId);
        toast({ variant: 'destructive', title: 'Erro ao Carregar', description: 'Nenhum dado de fluxo encontrado' });
        return;
      }

      if (!flowData.id || !flowData.name) {
        console.error('Dados de fluxo incompletos:', flowData);
        toast({ variant: 'destructive', title: 'Dados Incompletos', description: 'Os dados do fluxo estão incompletos' });
        return;
      }

      // Limpar o canvas atual antes de carregar o novo fluxo
      setNodes([]);
      setEdges([]);
      
      // Atualizar informações básicas do fluxo
      setFlowName(flowData.name);
      setFlowDescription(flowData.description || '');
      setFlowId(flowData.id);

      // Lidar com flow_data como string ou como objeto
      let parsedFlowData;
      try {
        if (!flowData.flow_data) {
          console.error('flow_data está vazio ou não existe');
          toast({ variant: 'default', title: 'Fluxo Vazio', description: 'O fluxo não contém dados estruturados' });
          return;
        } 
        
        console.log('Tipo do flow_data:', typeof flowData.flow_data);

        if (typeof flowData.flow_data === 'string') {
          console.log('flow_data é uma string, tentando fazer parse JSON');
          parsedFlowData = JSON.parse(flowData.flow_data);
        } else {
          console.log('flow_data já é um objeto');
          parsedFlowData = flowData.flow_data;
        }

        // Verificar e formatar nós para ReactFlow
        if (!parsedFlowData.nodes || !Array.isArray(parsedFlowData.nodes)) {
          console.error('nodes inválidos em parsedFlowData');
          parsedFlowData.nodes = [];
        } else {
          // Garantir que todos os nós tenham o tipo correto definido
          parsedFlowData.nodes = parsedFlowData.nodes.map((node: any) => {
            // Se o nó não tiver tipo, tente determiná-lo com base em sua estrutura
            if (!node.type && node.data) {
              if (node.data.choices) {
                node.type = 'choices';
              } else if (node.data.message) {
                node.type = 'botMessage';
              } else {
                node.type = 'attendant';
              }
              console.log(`Tipo determinado para nó ${node.id}: ${node.type}`);
            }
            return node;
          });
        }

        // Verificar e formatar arestas para ReactFlow
        if (!parsedFlowData.edges || !Array.isArray(parsedFlowData.edges)) {
          console.error('edges inválidos em parsedFlowData');
          parsedFlowData.edges = [];
        } else {
          // Garantir que todas as arestas tenham propriedades válidas
          parsedFlowData.edges = parsedFlowData.edges.map((edge: any) => {
            return {
              ...edge,
              type: edge.type || 'smoothstep',
              animated: true,
              style: edge.style || { stroke: '#3b82f6', strokeWidth: 2 },
              markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed, color: '#3b82f6' }
            };
          });
        }
      } catch (parseError) {
        console.error('Erro ao analisar flow_data:', parseError);
        parsedFlowData = { nodes: [], edges: [] };
        toast({ variant: 'destructive', title: 'Erro de Parse', description: 'Não foi possível analisar os dados do fluxo' });
        return;
      }

      console.log('Flow data parseado:', parsedFlowData);
      console.log('Nodes preparados:', parsedFlowData?.nodes);
      console.log('Edges preparados:', parsedFlowData?.edges);

      // Usar um timeout para garantir que o processo de renderização ocorra corretamente
      setTimeout(() => {
        try {
          // Aplicar nós e arestas formatados no ReactFlow
          setNodes(parsedFlowData?.nodes || []);
          setEdges(parsedFlowData?.edges || []);
          toast({ title: 'Fluxo Carregado', description: 'Fluxo carregado com sucesso!' });
          
          // Forçar o ReactFlow a se ajustar à visualização após o carregamento
          setTimeout(() => {
            // Despache um evento de redimensionamento para forçar o ReactFlow a recalcular
            window.dispatchEvent(new Event('resize'));
          }, 300);
        } catch (renderError) {
          console.error('Erro ao renderizar fluxo:', renderError);
          toast({ variant: 'destructive', title: 'Erro de Renderização', description: 'Não foi possível renderizar o fluxo no editor' });
        }
      }, 200);

    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Erro ao carregar o fluxo.';
      toast({ variant: 'destructive', title: 'Erro ao Carregar', description: errorMsg });
    }
  }, [setNodes, setEdges]);

  const createNewFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFlowId(null);
    setFlowName('Novo Fluxo de Chat');
    setFlowDescription('');
    setSelectedNodeId(null);
    toast({ title: 'Novo Fluxo', description: 'Novo fluxo criado com sucesso!' });
  }, [setNodes, setEdges]);

  // Função para abrir o diálogo de confirmação de exclusão
  const confirmDeleteFlow = useCallback((id: string) => {
    setFlowToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  // Função para excluir um fluxo pelo ID
  const deleteFlow = useCallback(async () => {
    if (!flowToDelete) return;

    try {
      const response = await axios.delete(`/api/chat-flows/${flowToDelete}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (response.data.success) {
        toast({ title: 'Fluxo Excluído', description: 'O fluxo foi excluído com sucesso!' });
        createNewFlow();
        setTimeout(() => fetchFlows(), 500);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Erro ao excluir o fluxo.' });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Erro ao excluir o fluxo.';
      toast({ variant: 'destructive', title: 'Erro ao Excluir', description: errorMsg });
    } finally {
      setIsDeleteDialogOpen(false);
      setFlowToDelete(null);
    }
  }, [flowId, flowToDelete, createNewFlow]);

  const fetchFlows = useCallback(async () => {
    setIsFetchingFlows(true);
    try {

      const response = await axios.get('/api/chat-flows', { headers: { Authorization: `Bearer ${auth.token}` } });

      let flows = [];
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Novo formato de resposta da API
        flows = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Formato antigo
        flows = response.data;
      }

      if (flows.length > 0) {
        // Usar a variável flows que já foi definida acima
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-background border border-border rounded-lg shadow-lg p-4 max-w-md w-full max-h-[80vh] overflow-auto text-foreground">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium">Fluxos Disponíveis</h3>
              <button id="close-modal" class="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div class="space-y-2">
              ${flows.map((flow: any) => `
                <div class="p-3 border border-border rounded-md hover:bg-muted cursor-pointer flow-item" data-id="${flow.id}">
                  <div class="flex justify-between items-start">
                    <div>
                      <h4 class="font-medium">${flow.name}</h4>
                      <p class="text-xs text-muted-foreground">${flow.description || 'Sem descrição'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="text-xs text-muted-foreground">${new Date(flow.updated_at).toLocaleDateString()}</div>
                      <button class="flow-delete-btn p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100" data-delete-id="${flow.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#close-modal')?.addEventListener('click', () => document.body.removeChild(modal));

        modal.querySelectorAll('.flow-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if ((e.target as Element).closest('.flow-delete-btn')) return;

            const flowId = item.getAttribute('data-id');
            if (flowId) {
              loadFlow(flowId);
              document.body.removeChild(modal);
            }
          });
        });

        modal.querySelectorAll('.flow-delete-btn').forEach(button => {
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            const flowId = button.getAttribute('data-delete-id');
            if (flowId) {
              document.body.removeChild(modal);
              setTimeout(() => confirmDeleteFlow(flowId), 100);
            }
          });
        });
      } else {
        toast({ variant: 'destructive', title: 'Nenhum Fluxo', description: 'Nenhum fluxo disponível.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao Buscar', description: 'Erro ao carregar fluxos.' });
    } finally {
      setIsFetchingFlows(false);
    }
  }, [loadFlow]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Desabilitar atalhos de teclado quando o builder está desativado
      if (!isBuilderEnabled) return;

      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' && selectedNodeId) deleteNode(selectedNodeId);
      if (e.key === '1' || e.key === 'b') {
        addNode('botMessage');
        toast({ title: 'Nó adicionado', description: 'Mensagem do Bot adicionada' });
      }
      if (e.key === '2' || e.key === 'c') {
        addNode('choices');
        toast({ title: 'Nó adicionado', description: 'Escolhas do Cliente adicionadas' });
      }
      if (e.key === '3' || e.key === 'a') {
        addNode('attendant');
        toast({ title: 'Nó adicionado', description: 'Atendente Humano adicionado' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode, addNode]);

  const nodeTypes: NodeTypes = useMemo(() => ({
    botMessage: (props) => <BotMessageNode {...props} onChange={updateNodeData} onDelete={deleteNode} selected={props.id === selectedNodeId} />,
    choices: (props) => <ChoicesNode {...props} onChange={updateNodeData} onDelete={deleteNode} selected={props.id === selectedNodeId} />,
    attendant: (props) => <AttendantNode {...props} onChange={updateNodeData} onDelete={deleteNode} selected={props.id === selectedNodeId} />,
  }), [updateNodeData, deleteNode, selectedNodeId]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isBuilderEnabled, setIsBuilderEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(false);
  const [availableFlows, setAvailableFlows] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const launchConfetti = (originX = 0.9, originY = 0.1) => {
    console.log('Lançando confeti sutil!');
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { x: originX, y: originY },
      colors: ['#4F46E5', '#0EA5E9', '#10B981'],
      zIndex: 1000,
      scalar: 0.7,
      gravity: 1,
      disableForReducedMotion: true,
    });
  };

  const loadConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);

      console.log('Usuário autenticado:', auth);

      const cachedConfig = localStorage.getItem('chatFlowConfig');
      const cacheTimestamp = localStorage.getItem('chatFlowConfigTimestamp');
      const cacheExpiration = 30 * 60 * 1000; // 30 minutos em milissegundos
      
      if (cachedConfig && cacheTimestamp) {
        const parsedConfig = JSON.parse(cachedConfig);
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();
        
        if (now - timestamp < cacheExpiration) {
          console.log('Usando configuração do cache:', parsedConfig);
          setFlowConfig(parsedConfig);
          setIsBuilderEnabled(Boolean(parsedConfig.is_active));
          setLoadingConfig(false);
          setIsInitialLoading(false);
          return;
        } else {
          localStorage.removeItem('chatFlowConfig');
          localStorage.removeItem('chatFlowConfigTimestamp');
        }
      }
      
      const response = await axios.get('/api/chat-flow-config', { headers: { Authorization: `Bearer ${auth.token}` } });

      if (response.data.success) {
        if (response.data.data && Object.keys(response.data.data).length > 0) {
          const config = response.data.data;
          console.log('Configuração carregada:', config);
          setFlowConfig(config);
          setIsBuilderEnabled(Boolean(config.is_active));
          
          localStorage.setItem('chatFlowConfig', JSON.stringify(config));
          localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        } else {
          const defaultConfig = {
            is_active: false,
            start_flow: null
          };

          const createResponse = await axios.put('/api/chat-flow-config', defaultConfig, { headers: { Authorization: `Bearer ${auth.token}` } });
          if (createResponse.data.success) {
            setFlowConfig(createResponse.data.data);
            setIsBuilderEnabled(false);
            
            localStorage.setItem('chatFlowConfig', JSON.stringify(createResponse.data.data));
            localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());

            toast({
              title: 'Configuração Criada',
              description: 'Configuração inicial do Chat Flow criada com sucesso.'
            });
          }
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar a configuração do Chat Flow.'
      });
    } finally {
      setLoadingConfig(false);
      setIsInitialLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<ChatFlowConfig>) => {
    try {
      const configToSend = { ...flowConfig, ...newConfig };

      if ('is_active' in configToSend) {
        configToSend.is_active = Boolean(configToSend.is_active);
      }
      
      if ('start_flow' in configToSend) {
        const rawValue = configToSend.start_flow;
        if (rawValue === null || rawValue === undefined) {
          configToSend.start_flow = null;
        } else if (typeof rawValue === 'number') {
          configToSend.start_flow = rawValue;
        } else if (typeof rawValue === 'string' && /^\d+$/.test(rawValue)) {
          configToSend.start_flow = parseInt(rawValue, 10);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Enviando configuração para API:', configToSend);
      }

      const response = await axios.put('/api/chat-flow-config', configToSend, { headers: { Authorization: `Bearer ${auth.token}` } });

      if (response.data.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Configuração atualizada com sucesso:', response.data.data);
        }
        setFlowConfig(response.data.data);
        
        localStorage.setItem('chatFlowConfig', JSON.stringify(response.data.data));
        localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        
        toast({
          title: 'Configuração Atualizada',
          description: 'As configurações foram salvas com sucesso.'
        });
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.'
      });
      return null;
    }
    // Remover flowConfig das dependências para evitar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alternar o estado de ativação do ChatFlow
  const toggleChatFlowActive = useCallback(async () => {
    const newState = !isBuilderEnabled;
    setIsBuilderEnabled(newState);

    try {
      // Log apenas em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('Alternando estado do builder para:', newState);
      }
      
      // Si estamos activando el chat builder, mostramos un pequeño efecto visual
      if (newState) {
        // Lanzar confeti sutil en el switch de activación
        const activateButton = document.querySelector('#activate-chat-button');
        if (activateButton) {
          const rect = activateButton.getBoundingClientRect();
          const x = (rect.left + 10) / window.innerWidth;
          const y = (rect.top + 10) / window.innerHeight;
          launchConfetti(x, y);
        } else {
          // Si no encontramos el botón, usamos una posición por defecto
          launchConfetti(0.2, 0.1);
        }
        
        // Establecemos el estado de celebración para mostrar el toast animado
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }

      // Simplificar o payload para evitar erros de tipo
      const payload: {
        is_active: boolean;
        start_flow?: number | null;
      } = {
        is_active: Boolean(newState)
      };
      
      // Só incluir start_flow se for um número válido
      const currentStartFlow = flowConfig.start_flow;
      if (currentStartFlow !== null && currentStartFlow !== undefined) {
        if (typeof currentStartFlow === 'number') {
          payload.start_flow = currentStartFlow;
        } else if (typeof currentStartFlow === 'string' && /^\d+$/.test(currentStartFlow)) {
          payload.start_flow = parseInt(currentStartFlow, 10);
        }
        // Se não for válido, não incluir no payload
      }

      // Configurar indicador de loading
      const loadingToast = toast({
        title: 'Atualizando...',
        description: <div className="flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando configuração</div>,
      });

      const response = await axios.put('/api/chat-flow-config', payload, { headers: { Authorization: `Bearer ${auth.token}` } });

      if (response.data.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Estado do builder alternado com sucesso:', response.data.data);
        }
        setFlowConfig(response.data.data);
        
        // Atualizar o cache
        localStorage.setItem('chatFlowConfig', JSON.stringify(response.data.data));
        localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        
        toast({
          title: newState ? 'Builder Ativado' : 'Builder Desativado',
          description: newState ? 'O builder está ativo e pronto para uso.' : 'O builder foi desativado.'
        });
      }
    } catch (error) {
      console.error('Erro ao alternar estado do builder:', error);
      // Reverter o estado em caso de erro
      setIsBuilderEnabled(!newState);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível alterar o estado do builder.'
      });
    }
  }, [isBuilderEnabled]);

  // Definir o fluxo atual como fluxo inicial
  const setAsStartFlow = useCallback(async () => {
    if (!flowId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'É necessário salvar o fluxo antes de defini-lo como inicial.'
      });
      return;
    }

    try {
      // Verificar se flowId é um número válido
      if (!/^\d+$/.test(flowId)) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'ID do fluxo inválido. O ID deve ser um número.'
        });
        return;
      }

      console.log('Definindo como fluxo inicial:', flowId);
      // Converter para número inteiro
      const flowIdInt = parseInt(flowId, 10);
      
      if (isNaN(flowIdInt)) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível converter o ID para número.'
        });
        return;
      }
      
      // Enviar apenas os dados necessários, com tipos corretos
      const payload = {
        is_active: flowConfig.is_active === true,
        start_flow: flowIdInt
      };
      
      console.log('Payload para API:', payload);

      // Usar diretamente o payload simplificado
      const response = await axios.put('/api/chat-flow-config', payload, { headers: { Authorization: `Bearer ${auth.token}` } });

      if (response.data.success) {
        console.log('Configuração atualizada com sucesso:', response.data.data);
        setFlowConfig(response.data.data);
        
        // Atualizar o cache
        localStorage.setItem('chatFlowConfig', JSON.stringify(response.data.data));
        localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        
        toast({
          title: 'Fluxo Inicial Definido',
          description: 'Este fluxo será iniciado automaticamente.'
        });
      } else {
        console.error('Erro na resposta da API:', response.data);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível definir como fluxo inicial.'
        });
      }
    } catch (error) {
      console.error('Erro ao definir fluxo inicial:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível definir como fluxo inicial.'
      });
    }
  }, [flowId, flowConfig]);

  // Atualize o estado isMobile com base no tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsBuilderEnabled(false);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        await loadConfig();       
        const currentConfig = await axios.get('/api/chat-flow-config', { headers: { Authorization: `Bearer ${auth.token}` } });
        const config = currentConfig.data.data || { is_active: false, start_flow: null };
        const response = await axios.get('/api/chat-flows', { headers: { Authorization: `Bearer ${auth.token}` } });
        const flows = response.data.data || [];

        setAvailableFlows(flows);

        if (process.env.NODE_ENV === 'development') {
          flows.forEach((flow: any, index: number) => {
            console.log(`Fluxo ${index + 1}:`, {
              id: flow.id,
              name: flow.name,
              has_flow_data: !!flow.flow_data,
              flow_data_type: typeof flow.flow_data
            });
          });
        }

        if (!config.is_active) {
          setIsWelcomeDialogOpen(false);
          
          if (flows.length === 0) {
            createNewFlow();
          } else {
            await loadFlow(flows[0].id);
          }
        } else {
          if (flows.length === 0) {
            createNewFlow();
            setIsWelcomeDialogOpen(false);
          } else if (flows.length === 1) {
            await loadFlow(flows[0].id);
            setIsWelcomeDialogOpen(false);
            createNewFlow();
            setIsWelcomeDialogOpen(false);
          } else if (flows.length === 1) {
            await loadFlow(flows[0].id);
            setIsWelcomeDialogOpen(false);
          } else {
            if (config.start_flow) {
              const startFlow = flows.find((flow: { id: number; name: string }) => flow.id === config.start_flow);
              if (startFlow) {
                console.log('Carregando fluxo inicial configurado:', startFlow.name);
                await loadFlow(startFlow.id);
                setIsWelcomeDialogOpen(false);
              } else {
                setIsWelcomeDialogOpen(true);
              }
            } else {
              setIsWelcomeDialogOpen(true);
            }
          }
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar os fluxos iniciais:', error);
        if (error && typeof error === 'object' && 'response' in error && error.response) {
          const axiosError = error as { response: { data: any; status: number } };
        }
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar fluxos',
          description: 'Criando um novo fluxo'
        });
        createNewFlow();
        setIsWelcomeDialogOpen(false);
      }
    };

    loadInitialData();
  }, [loadFlow, createNewFlow, loadConfig]);

  return (
    <>
      {/* Tela de carregamento com prioridade máxima */}
      {isInitialLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background backdrop-blur-sm" 
             style={{ pointerEvents: 'all' }}>
          <div className="flex flex-col items-center space-y-4 p-8 bg-card rounded-lg shadow-xl border border-border animate-in fade-in-50 duration-300">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
            <p className="text-xl font-medium text-foreground">Carregando Chat Builder</p>
            <p className="text-sm text-muted-foreground">Preparando o ambiente de edição...</p>
          </div>
        </div>
      )}
      
      {/* Notificación flotante sutil cuando se guarda */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            className="fixed bottom-4 right-4 z-50 pointer-events-none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="bg-card text-card-foreground border border-border px-4 py-2 rounded-md shadow-md"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.5, repeat: 1 }}
            >
              <p className="text-sm font-medium">Salvo com sucesso!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteFlow}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de boas-vindas com opções para carregar um fluxo existente ou criar um novo */}
      <Dialog open={isWelcomeDialogOpen && !isInitialLoading} onOpenChange={(open) => {
        if (!open) {
          // Quando o usuário fecha o diálogo (clicando no X ou fora do modal)
          setIsWelcomeDialogOpen(false);

          // Ativar o builder ao selecionar um fluxo
          setIsBuilderEnabled(true);

          // Se não houver fluxos, crie um novo
          if (availableFlows.length === 0) {
            createNewFlow();
          } else {
            // Se houver fluxos disponíveis, carregue o primeiro por padrão
            loadFlow(availableFlows[0].id);
          }
        }
      }}>
        <DialogContent className="bg-background border-border text-foreground max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Bem-vindo ao Chat Builder</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione um fluxo existente para editar ou crie um novo fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[50vh] overflow-y-auto">
            {availableFlows.length > 0 ? (
              <div className="space-y-3">
                {availableFlows.map((flow) => (
                  <div
                    key={flow.id}
                    className="p-3 border border-border rounded-md hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => {
                      console.log('Clicou no fluxo:', flow.name);
                      console.log('ID do fluxo selecionado:', flow.id);
                      loadFlow(flow.id.toString()); // Converter para string para garantir
                      setIsWelcomeDialogOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{flow.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {flow.description || 'Sem descrição'}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(flow.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum fluxo encontrado.</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  createNewFlow();
                  setIsWelcomeDialogOpen(false);
                }}
              >
                Criar Novo Fluxo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AppLayout>
        <ReactFlowProvider>
          <div className="relative h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
            {/* Header Controls Component */}
            <HeaderControls 
              flowName={flowName}
              setFlowName={setFlowName}
              flowDescription={flowDescription}
              setFlowDescription={setFlowDescription}
              isBuilderEnabled={isBuilderEnabled}
              toggleChatFlowActive={toggleChatFlowActive}
              isSaving={isSaving}
              saveFlow={saveFlow}
              flowId={flowId}
              flowConfig={flowConfig}
              setAsStartFlow={setAsStartFlow}
            />
            
            {/* Desktop Sidebar Component */}
            <Sidebar 
              isBuilderEnabled={isBuilderEnabled}
              addNode={addNode}
              fetchFlows={fetchFlows}
              createNewFlow={createNewFlow}
              isFetchingFlows={isFetchingFlows}
              toggleChatFlowActive={toggleChatFlowActive}
            />

            {/* Mobile Sidebar Component */}
            <MobileSidebar 
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              addNode={addNode}
              fetchFlows={fetchFlows}
              createNewFlow={createNewFlow}
              isFetchingFlows={isFetchingFlows}
              isBuilderEnabled={isBuilderEnabled}
              toggleChatFlowActive={toggleChatFlowActive}
            />

            {/* Flow Area Component */}
            <FlowArea 
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              isBuilderEnabled={isBuilderEnabled}
              isInitialLoading={isInitialLoading}
              isMobile={isMobile}
              setSelectedNodeId={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
              toggleChatFlowActive={toggleChatFlowActive}
              addNode={addNode}
            />
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
          .react-flow__node.selected {
            box-shadow: 0 0 0 2px #3b82f6;
          }
          .react-flow__handle {
            width: 12px !important;
            height: 12px !important;
            transition: transform 0.2s;
          }
          /* Animación sutil de hover en los nodos */
          .react-flow__node:hover {
            filter: brightness(1.05);
            transform: translateY(-2px);
            transition: all 0.2s ease;
          }
          /* Animación sutil para nodos cuando se conectan */
          .react-flow__edge-path {
            stroke-dasharray: 5;
            animation: flowPath 10s linear infinite;
          }
          @keyframes flowPath {
            to {
              stroke-dashoffset: -100;
            }
          }
          .react-flow__handle:hover {
            transform: scale(1.5);
          }
          .react-flow__edge-path {
            stroke: #3b82f6 !important;
            stroke-width: 2px !important;
          }
          @media (max-width: 768px) {
            .react-flow__handle {
              width: 16px !important;
              height: 16px !important;
            }
            .react-flow__minimap {
              display: none;
            }
          }
        ` }} />
        </ReactFlowProvider>
      </AppLayout>
      <Toaster />
    </>
  );
};

export default ChatBuilder;