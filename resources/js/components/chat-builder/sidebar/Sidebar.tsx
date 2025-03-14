import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SidebarProps {
  isBuilderEnabled: boolean;
  isFetchingFlows: boolean;
  toggleChatFlowActive: () => void;
  fetchFlows: () => void;
  createNewFlow: () => void;
  addNode: (type: "botMessage" | "choices" | "attendant") => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isBuilderEnabled,
  isFetchingFlows,
  toggleChatFlowActive,
  fetchFlows,
  createNewFlow,
  addNode,
}) => {
  return (
    <div className="hidden md:block w-64 p-4 pt-[76px] bg-background border-r border-border shadow-lg overflow-auto">
      <h3 className="text-lg font-semibold mb-4">Elementos</h3>
      <NodeButtons isBuilderEnabled={isBuilderEnabled} addNode={addNode} />
      
      <div className="mt-6 space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={fetchFlows}
          disabled={isFetchingFlows || !isBuilderEnabled}
        >
          {isFetchingFlows && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFetchingFlows ? 'Carregando...' : 'Carregar Fluxo'}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={createNewFlow}
          disabled={!isBuilderEnabled}
        >
          Novo Fluxo
        </Button>
      </div>
      
      <BuilderStatus isBuilderEnabled={isBuilderEnabled} toggleChatFlowActive={toggleChatFlowActive} />
      <Instructions />
    </div>
  );
};

const NodeButtons: React.FC<{ isBuilderEnabled: boolean; addNode: (type: "botMessage" | "choices" | "attendant") => void }> = ({ isBuilderEnabled, addNode }) => {
  return (
    <div className="space-y-2">
      <Button
        className="w-full bg-blue-600 hover:bg-blue-700"
        onClick={() => addNode('botMessage')}
        disabled={!isBuilderEnabled}
      >
        Mensagem do Bot
      </Button>
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={() => addNode('choices')}
        disabled={!isBuilderEnabled}
      >
        Escolhas do Cliente
      </Button>
      <Button
        className="w-full bg-purple-600 hover:bg-purple-700"
        onClick={() => addNode('attendant')}
        disabled={!isBuilderEnabled}
      >
        Atendente Humano
      </Button>
    </div>
  );
};

const BuilderStatus: React.FC<{ isBuilderEnabled: boolean; toggleChatFlowActive: () => void }> = ({
  isBuilderEnabled,
  toggleChatFlowActive,
}) => {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Status do Builder</h4>
      <div className="flex items-center space-x-2 mb-4 p-2 bg-muted rounded-md">
        <Switch
          id="sidebar-builder-switch"
          checked={isBuilderEnabled}
          onCheckedChange={toggleChatFlowActive}
        />
        <Label htmlFor="sidebar-builder-switch" className="text-sm cursor-pointer">
          {isBuilderEnabled ? 'Ativado' : 'Desativado'}
        </Label>
      </div>
    </div>
  );
};

const Instructions: React.FC = () => {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Instruções</h4>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>1/B: Mensagem</li>
        <li>2/C: Escolhas</li>
        <li>3/A: Atendente</li>
        <li>Delete: Excluir</li>
        <li>Arraste para conectar</li>
      </ul>
    </div>
  );
};

export default Sidebar;
