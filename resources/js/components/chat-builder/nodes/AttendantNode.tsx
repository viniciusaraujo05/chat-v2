import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AttendantNodeProps {
  id: string;
  data: {
    label: string;
    sequence: number;
  };
  selected: boolean;
  onChange: (id: string, data: Partial<{ label: string; sequence: number }>) => void;
  onDelete: (id: string) => void;
}

const AttendantNode: React.FC<AttendantNodeProps> = ({ id, data, selected, onChange, onDelete }) => {
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
};

export default React.memo(AttendantNode);
