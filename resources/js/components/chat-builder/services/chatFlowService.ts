import axios from 'axios';
import { Node, Edge } from 'reactflow';
import { ChatFlow, ChatFlowConfig, NodeData } from '../types';
import { toast } from '@/components/ui/use-toast';

export const chatFlowService = {
  // Load all chat flows
  async getFlows(): Promise<ChatFlow[]> {
    try {
      const response = await axios.get('/api/chat-flows');
      
      // Handle different API response formats
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching flows:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar os fluxos' });
      return [];
    }
  },

  // Load a specific chat flow
  async getFlow(id: string | number): Promise<ChatFlow | null> {
    try {
      const response = await axios.get(`/api/chat-flows/${id}`);
      
      // Handle different API response formats
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching flow:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar o fluxo' });
      return null;
    }
  },

  // Save or update a chat flow
  async saveFlow(
    flowName: string, 
    flowDescription: string, 
    nodes: Node<NodeData>[], 
    edges: Edge[], 
    flowId: string | null
  ): Promise<ChatFlow | null> {
    if (!flowName.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome do fluxo é obrigatório.' });
      return null;
    }

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
        toast({ title: 'Fluxo Criado', description: 'Novo fluxo salvo com sucesso!' });
      }
      
      // Return the saved flow
      return response.data.data || response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.name?.[0] || 'Erro ao salvar o fluxo.';
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: errorMsg });
      return null;
    }
  },

  // Delete a chat flow
  async deleteFlow(id: string): Promise<boolean> {
    try {
      const response = await axios.delete(`/api/chat-flows/${id}`);
      if (response.data.success) {
        toast({ title: 'Fluxo Excluído', description: 'O fluxo foi excluído com sucesso!' });
        return true;
      } else {
        toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Erro ao excluir o fluxo.' });
        return false;
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Erro ao excluir o fluxo.';
      toast({ variant: 'destructive', title: 'Erro ao Excluir', description: errorMsg });
      return false;
    }
  },

  // Load chat flow configuration
  async getConfig(): Promise<ChatFlowConfig | null> {
    try {
      // Check for cached configuration
      const cachedConfig = localStorage.getItem('chatFlowConfig');
      const cacheTimestamp = localStorage.getItem('chatFlowConfigTimestamp');
      const cacheExpiration = 30 * 60 * 1000; // 30 minutes
      
      // Use cached config if valid
      if (cachedConfig && cacheTimestamp) {
        const parsedConfig = JSON.parse(cachedConfig);
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();
        
        if (now - timestamp < cacheExpiration) {
          return parsedConfig;
        }
      }
      
      // Fetch from API if no valid cache
      const response = await axios.get('/api/chat-flow-config');
      
      if (response.data.success && response.data.data) {
        const config = response.data.data;
        
        // Update cache
        localStorage.setItem('chatFlowConfig', JSON.stringify(config));
        localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        
        return config;
      }
      
      // Create default config if none exists
      const defaultConfig = {
        is_active: false,
        start_flow: null
      };
      
      const createResponse = await axios.put('/api/chat-flow-config', defaultConfig);
      if (createResponse.data.success) {
        const newConfig = createResponse.data.data;
        
        // Update cache
        localStorage.setItem('chatFlowConfig', JSON.stringify(newConfig));
        localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        
        return newConfig;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching config:', error);
      return null;
    }
  },

  // Update chat flow configuration
  async updateConfig(config: Partial<ChatFlowConfig>): Promise<ChatFlowConfig | null> {
    try {
      // Convert is_active to boolean if present
      if ('is_active' in config) {
        config.is_active = Boolean(config.is_active);
      }
      
      const response = await axios.put('/api/chat-flow-config', config);
      
      if (response.data.success) {
        const updatedConfig = response.data.data;
        
        // Update cache
        localStorage.setItem('chatFlowConfig', JSON.stringify(updatedConfig));
        localStorage.setItem('chatFlowConfigTimestamp', Date.now().toString());
        
        return updatedConfig;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating config:', error);
      return null;
    }
  }
};
