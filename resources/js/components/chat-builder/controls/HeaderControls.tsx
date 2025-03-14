import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { ChatFlowConfig } from '../types';

interface HeaderControlsProps {
  flowName: string;
  setFlowName: (name: string) => void;
  flowDescription: string;
  setFlowDescription: (description: string) => void;
  isBuilderEnabled: boolean;
  toggleChatFlowActive: () => void;
  isSaving: boolean;
  saveFlow: () => void;
  flowId: string | null;
  flowConfig: ChatFlowConfig;
  setAsStartFlow: () => void;
}

const HeaderControls: React.FC<HeaderControlsProps> = ({
  flowName,
  setFlowName,
  flowDescription,
  setFlowDescription,
  isBuilderEnabled,
  toggleChatFlowActive,
  isSaving,
  saveFlow,
  flowId,
  flowConfig,
  setAsStartFlow,
}) => {
  return (
    <div className="absolute z-10 top-0 left-0 right-0 p-2 md:p-4 bg-background shadow-md border-b border-border">
      <div className="flex flex-col md:flex-row md:items-center gap-2 w-full max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between w-full md:w-auto md:mr-4 p-2 bg-muted/40 rounded-md border border-border">
          <div className="flex items-center space-x-2">
            <Switch
              id="builder-switch"
              checked={isBuilderEnabled}
              onCheckedChange={toggleChatFlowActive}
            />
            <Label htmlFor="builder-switch" className="text-sm font-medium">
              {isBuilderEnabled ? 'Chat Builder Ativado' : 'Chat Builder Desativado'}
            </Label>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-2">
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Nome do Fluxo"
            className="w-full md:w-48 bg-background border-border text-foreground"
            disabled={!isBuilderEnabled}
          />
          <Input
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
            placeholder="Descrição"
            className="w-full md:w-48 bg-background border-border text-foreground"
            disabled={!isBuilderEnabled}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
          <Button
            onClick={saveFlow}
            disabled={isSaving || !isBuilderEnabled}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Salvando...' : flowId ? 'Atualizar' : 'Salvar'}
          </Button>

          {flowId && (
            <Button
              onClick={setAsStartFlow}
              disabled={!isBuilderEnabled || !flowId}
              variant={flowConfig.start_flow?.toString() === flowId ? "default" : "outline"}
              className={flowConfig.start_flow?.toString() === flowId ? "bg-green-600 hover:bg-green-700" : ""}
              title={flowConfig.start_flow?.toString() === flowId ? "Este já é o fluxo inicial" : "Definir como fluxo inicial"}
            >
              {flowConfig.start_flow?.toString() === flowId ? "Fluxo Inicial" : "Definir como Inicial"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderControls;
