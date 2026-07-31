export interface ProjectContext {
  name: string;
  techStack: string[];
  fileTree: string;
  entryPoints: { path: string; content: string }[];
  dependencies: string[];
  totalFiles: number;
}

// ─── Node Types (matching Arc Web) ──────────────────────────────────

export type NodeType =
  // Basic shapes
  'box' | 'diamond' | 'circle' | 'triangle' | 'star' | 'pill' |
  'hexagon' | 'parallelogram' | 'database' | 'note' | 'path' | 'comment' |
  // Connectors
  'line' | 'arrow' |
  // UML
  'uml-class' | 'uml-interface' | 'uml-abstract' | 'uml-enum' |
  'actor' | 'use-case' | 'component' |
  // Flowchart
  'rounded-rect' | 'terminator' | 'process' | 'document' |
  'manual-input' | 'decision-merge' | 'io-data' |
  // Architecture
  'cylinder' | 'cloud' | 'queue' | 'browser' | 'mobile' | 'server' |
  // Layout
  'group-frame' | 'callout' | 'badge' |
  // Escape hatches
  'custom-block' | 'custom-connector';

export type ArrowHeadType = 'none' | 'filled' | 'open' | 'hollow' | 'diamond-filled' | 'diamond-hollow';

export interface NodeSection {
  title: string;
  items: string[];
}

export interface DiagramNode {
  id: string;
  type: NodeType | string;
  content: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  style?: Record<string, string>;
  rotation?: number;
  // Edge connection points (calculated by layout engine)
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  // Connection (for edges)
  startConnection?: { nodeId: string; anchor: string };
  endConnection?: { nodeId: string; anchor: string };
  // Edge properties
  label?: string;
  labelPosition?: 'mid' | 'start' | 'end';
  lineStyle?: string;
  lineCurve?: 'straight' | 'curved';
  arrowHead?: ArrowHeadType | string;
  arrowTail?: ArrowHeadType | string;
  arrowType?: string;
  routing?: string;
  waypoints?: { x: number; y: number }[];
  points?: { x: number; y: number }[];
  customConnectorStyle?: Record<string, string | number>;
  // Node metadata
  tag?: string;
  groupId?: string;
  groupTitle?: string;
  groupColor?: string;
  stereotype?: string;
  sections?: NodeSection[];
}

export interface ArquilatDiagram {
  version: string;
  nodes: DiagramNode[];
}
