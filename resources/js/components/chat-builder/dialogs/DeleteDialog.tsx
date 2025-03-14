import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onDelete: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ isOpen, setIsOpen, onDelete }) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-background border-border text-foreground max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDialog;
