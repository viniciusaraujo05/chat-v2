import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeDragHandler,
  MarkerType,
} from 'reactflow';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { NodeData } from '../types';

interface FlowAreaProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  isBuilderEnabled: boolean;
  isInitialLoading: boolean;
  isMobile: boolean;
  nodeTypes: NodeTypes;
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;
  onNodeDrag?: NodeDragHandler;
  toggleChatFlowActive: () => void;
  addNode: (type: 'botMessage' | 'choices' | 'attendant') => void;
}

const FlowArea: React.FC<FlowAreaProps> = ({
  nodes,
  edges,
  isBuilderEnabled,
  isInitialLoading,
  isMobile,
  nodeTypes,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setSelectedNodeId,
  onNodeDrag,
  toggleChatFlowActive,
  addNode,
}) => {
  return (
    <div className="h-full flex-1 pt-[90px] md:pt-[76px] relative overflow-hidden">
      {/* Overlay when Chat Builder is disabled */}
      {!isBuilderEnabled && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="text-center p-6 bg-card border border-border rounded-lg shadow-lg max-w-md">
            <h3 className="text-xl font-bold mb-4 text-foreground">Chat Builder Desativado</h3>
            <p className="text-muted-foreground mb-6">Ative o Chat Builder usando o switch no topo da página para começar a editar os fluxos de chat.</p>
            <div className="flex items-center justify-center space-x-3">
              <Switch
                id="builder-switch-overlay"
                checked={isBuilderEnabled}
                onCheckedChange={toggleChatFlowActive}
              />
              <Label htmlFor="builder-switch-overlay" className="cursor-pointer">
                Ativar agora
              </Label>
            </div>
          </div>
        </div>
      )}

      {isInitialLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-background border border-border rounded-md overflow-hidden">
          <div className="p-6 bg-card border border-border rounded-lg shadow-md">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Carregando Chat Builder</h2>
              <p className="text-sm text-muted-foreground text-center">Verificando configuração do Chat Flow...</p>
            </div>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isBuilderEnabled ? onNodesChange : undefined}
          onEdgesChange={isBuilderEnabled ? onEdgesChange : undefined}
          onConnect={isBuilderEnabled ? onConnect : undefined}
          nodeTypes={nodeTypes}
          onNodeClick={isBuilderEnabled ? (_, node) => setSelectedNodeId(node.id) : undefined}
          onNodeDragStop={onNodeDrag}
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
          zoomOnDoubleClick={!isMobile && isBuilderEnabled}
          zoomOnScroll={!isMobile && isBuilderEnabled}
          panOnScroll={!isMobile && isBuilderEnabled}
          panOnDrag={isBuilderEnabled}
          zoomOnPinch={isBuilderEnabled}
          nodesDraggable={isBuilderEnabled}
          nodesConnectable={isBuilderEnabled}
          elementsSelectable={isBuilderEnabled}
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
      )}

      {/* Mobile action buttons */}
      {isMobile && isBuilderEnabled && (
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
  );
};

export default FlowArea;
