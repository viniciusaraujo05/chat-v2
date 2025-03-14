import { Node, Edge } from 'reactflow';

export interface ChatFlowConfig {
  id?: number;
  is_active: boolean;
  start_flow: number | null;
  startFlow?: {
    id: number;
    name: string;
  };
}

export interface NodeData {
  label: string;
  message?: string;
  choices?: string[];
  sequence: number;
}

export interface ChatFlow {
  id: number;
  name: string;
  description?: string;
  flow_data?: string | { nodes: Node<NodeData>[]; edges: Edge[] };
  created_at?: string;
  updated_at?: string;
}
