import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  NodeTypes,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Menu, X, Loader2, Trash2, Plus, Move, MenuIcon } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';

interface NodeData {
  label: string;
  message?: string;
  choices?: string[];
  sequence: number;
}

const BotMessageNode = React.memo(({ id, data, selected, onChange, onDelete }: any) => {
  const handleInputInteraction = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card className={`w-full md:w-72 border ${selected ? 'ring-2 ring-blue-400' : 'border-blue-600'} bg-background text-foreground shadow-md`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-400 border-2 border-blue-600" />
      <CardHeader className="p-3 rounded-t-md">
        <CardTitle className="flex items-center gap-2">
          <Input
            type="number"
            value={data.sequence}
            onChange={(e) => onChange(id, { sequence: parseInt(e.target.value) || 0 })}
            className="w-16 text-center bg-muted border-input text-foreground"
            onClick={handleInputInteraction}
          />
          <Input
            value={data.label}
            onChange={(e) => onChange(id, { label: e.target.value })}
            placeholder="Título"
            className="flex-1 bg-muted border-input text-foreground"
            onClick={handleInputInteraction}
          />
          {selected && (
            <Button variant="destructive" size="icon" onClick={() => onDelete(id)}>
              X
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <Textarea
          value={data.message || ''}
          onChange={(e) => onChange(id, { message: e.target.value })}
          placeholder="Mensagem do Bot"
          className="w-full min-h-[100px] bg-muted border-input text-foreground"
          onClick={handleInputInteraction}
        />
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-400 border-2 border-blue-600" />
    </Card>
  );
});

const ChoicesNode = React.memo(({ id, data, selected, onChange, onDelete }: any) => {
  const handleInputInteraction = (e: React.MouseEvent) => e.stopPropagation();

  const addChoice = () => onChange(id, { choices: [...(data.choices || []), `Opção ${(data.choices?.length || 0) + 1}`] });
  const updateChoice = (index: number, value: string) => {
    const newChoices = [...(data.choices || [])];
    newChoices[index] = value;
    onChange(id, { choices: newChoices });
  };
  const removeChoice = (index: number) => onChange(id, { choices: data.choices.filter((_: any, i: number) => i !== index) });

  return (
    <Card className={`w-full md:w-72 border ${selected ? 'ring-2 ring-green-400' : 'border-green-600'} bg-background text-foreground shadow-md`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-400 border-2 border-green-600" />
      <CardHeader className="p-3 rounded-t-md">
        <CardTitle className="flex items-center gap-2">
          <Input
            type="number"
            value={data.sequence}
            onChange={(e) => onChange(id, { sequence: parseInt(e.target.value) || 0 })}
            className="w-16 text-center bg-muted border-input text-foreground"
            onClick={handleInputInteraction}
          />
          <Input
            value={data.label}
            onChange={(e) => onChange(id, { label: e.target.value })}
            placeholder="Título"
            className="flex-1 bg-muted border-input text-foreground"
            onClick={handleInputInteraction}
          />
          {selected && (
            <Button variant="destructive" size="icon" onClick={() => onDelete(id)}>
              X
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <Label className="text-muted-foreground">Escolhas:</Label>
        {(data.choices || []).map((choice: string, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-2 relative">
            <Input
              value={choice}
              onChange={(e) => updateChoice(index, e.target.value)}
              className="flex-1 bg-muted border-input text-foreground"
              onClick={handleInputInteraction}
            />
            <Button variant="destructive" size="icon" onClick={() => removeChoice(index)}>
              X
            </Button>
            <Handle
              type="source"
              position={Position.Right}
              id={`choice-${index}`}
              className="w-3 h-3 bg-green-400 border-2 border-green-600 absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
            />
          </div>
        ))}
        <Button variant="outline" onClick={addChoice} className="w-full mt-2">
          + Adicionar Escolha
        </Button>
      </CardContent>
    </Card>
  );
});

const AttendantNode = React.memo(({ id, data, selected, onChange, onDelete }: any) => {
  const handleInputInteraction = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card className={`w-full md:w-72 border ${selected ? 'ring-2 ring-purple-400' : 'border-purple-600'} bg-background text-foreground shadow-md`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-400 border-2 border-purple-600" />
      <CardHeader className="p-3 rounded-t-md">
        <CardTitle className="flex items-center gap-2">
          <Input
            type="number"
            value={data.sequence}
            onChange={(e) => onChange(id, { sequence: parseInt(e.target.value) || 0 })}
            className="w-16 text-center bg-muted border-input text-foreground"
            onClick={handleInputInteraction}
          />
          <Input
            value={data.label}
            onChange={(e) => onChange(id, { label: e.target.value })}
            placeholder="Título"
            className="flex-1 bg-muted border-input text-foreground"
            onClick={handleInputInteraction}
          />
          {selected && (
            <Button variant="destructive" size="icon" onClick={() => onDelete(id)}>
              X
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-muted-foreground">
        Inicia o chat com um atendente humano.
      </CardContent>
    </Card>
  );
});

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
    
    // Garantir que source e target existam e sejam strings
    if (!params.source || !params.target) {
      console.error('Source ou target inválidos:', params);
      return;
    }
    
    const edge: Edge = {
      id: `e-${params.source}-${params.target}-${Date.now()}`,
      source: params.source, // String não nula
      target: params.target, // String não nula
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
      if (flowId) {
        response = await axios.put(`/api/chat-flows/${flowId}`, flowData);
        toast({ title: 'Fluxo Atualizado', description: 'Alterações salvas com sucesso!' });
      } else {
        response = await axios.post('/api/chat-flows', flowData);
        setFlowId(response.data.data.id);
        toast({ title: 'Fluxo Criado', description: 'Novo fluxo salvo com sucesso!' });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.name?.[0] || 'Erro ao salvar o fluxo.';
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: errorMsg });
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, flowId, flowName, flowDescription]);

  const loadFlow = useCallback(async (id: string | number) => {
    const flowId = id.toString(); // Garante que o ID seja uma string
    console.log('Tentando carregar fluxo com ID:', flowId, 'tipo:', typeof flowId);
    try {
      // Verificar se temos um ID válido
      if (!flowId) {
        console.error('ID de fluxo inválido:', flowId);
        toast({ variant: 'destructive', title: 'Erro', description: 'ID de fluxo inválido' });
        return;
      }
      
      console.log(`Fazendo requisição para: /api/chat-flows/${flowId}`);
      const response = await axios.get(`/api/chat-flows/${flowId}`);
      console.log('Resposta da API completa:', response);
      console.log('Status da resposta:', response.status);
      console.log('Dados da resposta:', response.data);
      
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
      
      // Lidar com flow_data como string ou como objeto
      let parsedFlowData;
      try {
        if (!flowData.flow_data) {
          console.error('flow_data está vazio ou não existe');
          parsedFlowData = { nodes: [], edges: [] };
          toast({ variant: 'default', title: 'Fluxo Vazio', description: 'O fluxo não contém dados estruturados' });
        } else {
          console.log('Tipo do flow_data:', typeof flowData.flow_data);
          
          if (typeof flowData.flow_data === 'string') {
            console.log('flow_data é uma string, tentando fazer parse JSON');
            parsedFlowData = JSON.parse(flowData.flow_data);
          } else {
            console.log('flow_data já é um objeto');
            parsedFlowData = flowData.flow_data;
          }
          
          // Verificar estrutura do parsedFlowData
          if (!parsedFlowData.nodes || !Array.isArray(parsedFlowData.nodes)) {
            console.error('nodes inválidos em parsedFlowData');
            parsedFlowData.nodes = [];
          }
          
          if (!parsedFlowData.edges || !Array.isArray(parsedFlowData.edges)) {
            console.error('edges inválidos em parsedFlowData');
            parsedFlowData.edges = [];
          }
        }
      } catch (parseError) {
        console.error('Erro ao analisar flow_data:', parseError);
        parsedFlowData = { nodes: [], edges: [] };
        toast({ variant: 'destructive', title: 'Erro de Parse', description: 'Não foi possível analisar os dados do fluxo' });
      }
      
      console.log('Flow data parseado:', parsedFlowData);
      console.log('Nodes:', parsedFlowData?.nodes);
      console.log('Edges:', parsedFlowData?.edges);
      
      // Limpar o canvas atual antes de carregar o novo fluxo
      setNodes([]);
      setEdges([]);
      
      // Pequeno timeout para garantir que o canvas foi limpo
      setTimeout(() => {
        setNodes(parsedFlowData?.nodes || []);
        setEdges(parsedFlowData?.edges || []);
        setFlowName(flowData.name);
        setFlowDescription(flowData.description || '');
        setFlowId(flowData.id);
        toast({ title: 'Fluxo Carregado', description: 'Fluxo carregado com sucesso!' });
      }, 100);
      
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
      const response = await axios.delete(`/api/chat-flows/${flowToDelete}`);
      if (response.data.success) {
        toast({ title: 'Fluxo Excluído', description: 'O fluxo foi excluído com sucesso!' });
        // Sempre limpar o editor após excluir um fluxo
        createNewFlow();
        // Recarregar a lista de fluxos após excluir com sucesso
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
      const response = await axios.get('/api/chat-flows');
      console.log('Resposta ao buscar fluxos:', response.data);
      // Verificar se os dados estão disponíveis no formato esperado
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
        
        // Adicionar evento de clique para carregar fluxo
        modal.querySelectorAll('.flow-item').forEach(item => {
          item.addEventListener('click', (e) => {
            // Ignorar cliques no botão de excluir
            if ((e.target as Element).closest('.flow-delete-btn')) return;
            
            const flowId = item.getAttribute('data-id');
            if (flowId) {
              loadFlow(flowId);
              document.body.removeChild(modal);
            }
          });
        });
        
        // Adicionar evento de clique para excluir fluxo
        modal.querySelectorAll('.flow-delete-btn').forEach(button => {
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            const flowId = button.getAttribute('data-delete-id');
            if (flowId) {
              document.body.removeChild(modal);
              // Abrir o diálogo de confirmação após fechar o modal
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

  // Estado para controlar a visibilidade do menu lateral em dispositivos móveis
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Detecta se a tela é pequena (mobile)
  const [isMobile, setIsMobile] = useState(false);
  const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(true);
  const [availableFlows, setAvailableFlows] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Atualize o estado isMobile com base no tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Carrega os fluxos disponíveis quando a página é aberta
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('Iniciando carregamento de dados iniciais...');
      try {
        const response = await axios.get('/api/chat-flows');
        console.log('Resposta completa da API:', response.data);
        
        // Atualizado para o novo formato da API
        const flows = response.data.data || [];
        console.log('Fluxos disponíveis:', flows);
        console.log('Número de fluxos encontrados:', flows.length);
        
        setAvailableFlows(flows);
        
        // Verificar detalhes de cada fluxo para debug
        flows.forEach((flow: any, index: number) => {
          console.log(`Fluxo ${index + 1}:`, { 
            id: flow.id, 
            name: flow.name, 
            has_flow_data: !!flow.flow_data,
            flow_data_type: typeof flow.flow_data
          });
        });
        
        if (flows.length === 0) {
          // Se não houver fluxos, não mostramos o diálogo e criamos um novo fluxo
          console.log('Nenhum fluxo encontrado, criando um novo fluxo');
          createNewFlow();
          setIsWelcomeDialogOpen(false);
        } else if (flows.length === 1) {
          // Se houver apenas um fluxo, carregamos automaticamente
          console.log('Um único fluxo encontrado, carregando automaticamente');
          await loadFlow(flows[0].id);
          setIsWelcomeDialogOpen(false);
        } else {
          // Se houver múltiplos fluxos, mostramos o diálogo para o usuário escolher
          console.log('Múltiplos fluxos encontrados, mostrando diálogo de seleção');
          setIsWelcomeDialogOpen(true);
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar os fluxos iniciais:', error);
        if (error && typeof error === 'object' && 'response' in error && error.response) {
          const axiosError = error as { response: { data: any; status: number } };
          console.error('Resposta de erro:', axiosError.response.data);
          console.error('Status do erro:', axiosError.response.status);
        }
        // Em caso de erro, criamos um novo fluxo
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao carregar fluxos', 
          description: 'Criando um novo fluxo' 
        });
        createNewFlow();
        setIsWelcomeDialogOpen(false);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadInitialData();
  }, [loadFlow, createNewFlow]);
  
  return (
    <>
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
        
        // Se não houver fluxos, crie um novo
        if (availableFlows.length === 0) {
          createNewFlow();
        } else if (availableFlows.length > 0) {
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
            {availableFlows.length > 0 && (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  console.log('Clicou em Carregar o Primeiro Fluxo');
                  console.log('ID do primeiro fluxo:', availableFlows[0].id);
                  if (availableFlows.length > 0) {
                    loadFlow(availableFlows[0].id.toString()); // Converter para string para garantir
                    setIsWelcomeDialogOpen(false);
                  }
                }}
              >
                Carregar o Primeiro Fluxo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <AppLayout>
      <ReactFlowProvider>
        <div className="relative h-screen bg-background text-foreground flex flex-col md:flex-row">
          {/* Barra de navegação móvel */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold">Chat Builder</h3>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80%] p-0 bg-background text-foreground">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Elementos</h3>
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        onClick={() => {
                          addNode('botMessage');
                          setMobileMenuOpen(false);
                        }}
                      >
                        Mensagem do Bot
                      </Button>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700" 
                        onClick={() => {
                          addNode('choices');
                          setMobileMenuOpen(false);
                        }}
                      >
                        Escolhas do Cliente
                      </Button>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700" 
                        onClick={() => {
                          addNode('attendant');
                          setMobileMenuOpen(false);
                        }}
                      >
                        Atendente Humano
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        fetchFlows();
                        setMobileMenuOpen(false);
                      }}
                      disabled={isFetchingFlows}
                    >
                      {isFetchingFlows && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isFetchingFlows ? 'Carregando...' : 'Carregar Fluxo'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        createNewFlow();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Novo Fluxo
                    </Button>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Instruções</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>1/B: Mensagem</li>
                      <li>2/C: Escolhas</li>
                      <li>3/A: Atendente</li>
                      <li>Delete: Excluir</li>
                      <li>Arraste para conectar</li>
                    </ul>
                  </div>
                </div>
                <SheetFooter className="p-4 border-t border-border">
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full">Fechar</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Menu lateral para desktop */}
          <div className="hidden md:block w-64 p-4 bg-background border-r border-border shadow-lg overflow-auto">
            <h3 className="text-lg font-semibold mb-4">Elementos</h3>
            <div className="space-y-2">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => addNode('botMessage')}>
                Mensagem do Bot
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => addNode('choices')}>
                Escolhas do Cliente
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => addNode('attendant')}>
                Atendente Humano
              </Button>
            </div>
            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={fetchFlows}
                disabled={isFetchingFlows}
              >
                {isFetchingFlows && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isFetchingFlows ? 'Carregando...' : 'Carregar Fluxo'}
              </Button>
              <Button variant="outline" className="w-full" onClick={createNewFlow}>
                Novo Fluxo
              </Button>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Instruções</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1/B: Mensagem</li>
                <li>2/C: Escolhas</li>
                <li>3/A: Atendente</li>
                <li>Delete: Excluir</li>
                <li>Arraste para conectar</li>
              </ul>
            </div>
          </div>

          <div className="flex-1 relative">
            {/* Barra superior com controles de fluxo */}
            <div className="absolute z-10 top-4 left-4 right-4 p-2 md:p-4 bg-background shadow-md rounded-md border border-border">
              <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                <div className="flex-1 flex flex-col md:flex-row gap-2">
                  <Input
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="Nome do Fluxo"
                    className="w-full md:w-48 bg-muted border-input text-foreground"
                  />
                  <Input
                    value={flowDescription}
                    onChange={(e) => setFlowDescription(e.target.value)}
                    placeholder="Descrição"
                    className="w-full md:w-48 bg-muted border-input text-foreground"
                  />
                </div>
                <Button
                  onClick={saveFlow}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 mt-2 md:mt-0"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Salvando...' : flowId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </div>
            
            {/* Área do fluxo */}
            <div className="h-full pt-[80px] md:pt-[68px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                fitView
                snapToGrid={true}
                snapGrid={[20, 20]}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: true,
                  style: { stroke: '#3b82f6', strokeWidth: 2 },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                }}
                className="bg-background"
                zoomOnDoubleClick={!isMobile}
                zoomOnScroll={!isMobile}
                panOnScroll={isMobile}
                panOnDrag={true}
                zoomOnPinch={true}
              >
                <Background gap={20} color="#444" />
                <Controls 
                  className="bg-background border-border" 
                  showInteractive={!isMobile}
                  position={isMobile ? "bottom-right" : "bottom-left"}
                />
                {!isMobile && <MiniMap 
                  nodeStrokeWidth={3} 
                  className="bg-background border-border" 
                  zoomable 
                  pannable 
                />}
              </ReactFlow>
              
              {/* Botões de ação flutuantes para dispositivos móveis */}
              {isMobile && (
                <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-20">
                  <Button 
                    className="rounded-full h-12 w-12 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center"
                    onClick={() => addNode('botMessage')}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                  <Button 
                    className="rounded-full h-12 w-12 p-0 bg-green-600 hover:bg-green-700 shadow-lg flex items-center justify-center"
                    onClick={() => addNode('choices')}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                  <Button 
                    className="rounded-full h-12 w-12 p-0 bg-purple-600 hover:bg-purple-700 shadow-lg flex items-center justify-center"
                    onClick={() => addNode('attendant')}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
        .react-flow__node.selected {
          box-shadow: 0 0 0 2px #3b82f6;
        }
        .react-flow__handle {
          width: 12px !important;
          height: 12px !important;
          transition: transform 0.2s;
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
      `}</style>
      </ReactFlowProvider>
    </AppLayout>
    <Toaster />
    </>
  );
};

export default ChatBuilder;