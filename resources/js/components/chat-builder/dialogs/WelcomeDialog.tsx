import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatFlow } from '../types';

interface WelcomeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  availableFlows: ChatFlow[];
  loadFlow: (id: string | number) => Promise<void>;
  createNewFlow: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  isOpen,
  setIsOpen,
  availableFlows,
  loadFlow,
  createNewFlow,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsOpen(false);
        
        if (availableFlows.length > 0) {
          loadFlow(availableFlows[0].id);
        } else {
          createNewFlow();
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
                    loadFlow(flow.id.toString());
                    setIsOpen(false);
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
                      {flow.updated_at && new Date(flow.updated_at).toLocaleDateString()}
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
                setIsOpen(false);
              }}
            >
              Criar Novo Fluxo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
