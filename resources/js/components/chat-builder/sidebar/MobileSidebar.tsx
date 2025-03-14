import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MenuIcon } from 'lucide-react';
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

interface MobileSidebarProps {
  isBuilderEnabled: boolean;
  isFetchingFlows: boolean;
  fetchFlows: () => void;
  createNewFlow: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  addNode: (type: "botMessage" | "choices" | "attendant") => void;
  toggleChatFlowActive: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isBuilderEnabled,
  isFetchingFlows,
  fetchFlows,
  createNewFlow,
  setMobileMenuOpen,
  mobileMenuOpen,
  addNode,
}) => {
  const handleAddNode = (type: 'botMessage' | 'choices' | 'attendant') => {
    addNode(type);
    setMobileMenuOpen(false);
  };

  return (
    <div className="md:hidden flex items-center justify-between p-4 mt-[76px] border-b border-border">
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
                  onClick={() => handleAddNode('botMessage')}
                >
                  Mensagem do Bot
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleAddNode('choices')}
                >
                  Escolhas do Cliente
                </Button>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleAddNode('attendant')}
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
  );
};

export default MobileSidebar;
