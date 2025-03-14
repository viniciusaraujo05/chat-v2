import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChoicesNodeProps {
  id: string;
  data: {
    label: string;
    choices?: string[];
    sequence: number;
  };
  selected: boolean;
  onChange: (id: string, data: Partial<{ label: string; choices: string[]; sequence: number }>) => void;
  onDelete: (id: string) => void;
}

const ChoicesNode: React.FC<ChoicesNodeProps> = ({ id, data, selected, onChange, onDelete }) => {
  const handleInputInteraction = (e: React.MouseEvent) => e.stopPropagation();

  const addChoice = () => onChange(id, { choices: [...(data.choices || []), `Opção ${(data.choices?.length || 0) + 1}`] });
  
  const updateChoice = (index: number, value: string) => {
    const newChoices = [...(data.choices || [])];
    newChoices[index] = value;
    onChange(id, { choices: newChoices });
  };
  
  const removeChoice = (index: number) => onChange(id, { choices: data.choices?.filter((_: any, i: number) => i !== index) });

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
};

export default React.memo(ChoicesNode);
