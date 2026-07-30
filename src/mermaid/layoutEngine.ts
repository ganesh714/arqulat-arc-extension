/**
 * Layout Engine — Direct port of Arc Web's layoutEngine.ts
 * Uses dagre for automatic graph layout.
 */
import dagre from 'dagre';
import type { DiagramNode } from '../types';

/** Calculate smart dimensions based on node type and content length */
function getSmartDimensions(node: DiagramNode): { width: number; height: number } {
  if (node.dimensions?.width && node.dimensions?.height &&
      !(node.dimensions.width === 220 && node.dimensions.height === 90)) {
    return { width: node.dimensions.width, height: node.dimensions.height };
  }

  const content = node.content || '';
  const charCount = content.length;

  let baseWidth = 160;
  let baseHeight = 60;

  if (node.type === 'pill' || node.type === 'terminator') {
    baseWidth = 130;
    baseHeight = 50;
  } else if (node.type === 'diamond' || node.type === 'circle') {
    baseWidth = 160;
    baseHeight = 80;
  }

  const calcWidth = Math.max(baseWidth, Math.min(280, charCount * 8 + 40));
  const lines = Math.max(1, Math.ceil((charCount * 8) / Math.max(1, calcWidth - 40)));
  const calcHeight = Math.max(baseHeight, lines * 20 + 40);

  return { width: Math.round(calcWidth), height: Math.round(calcHeight) };
}

export function autoLayoutNodes(nodes: DiagramNode[]): DiagramNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  const isEdge = (n: DiagramNode) => ['arrow', 'line', 'custom-connector'].includes(n.type);

  const realNodes = nodes.filter(n => !isEdge(n));
  const edges = nodes.filter(n => isEdge(n));

  realNodes.forEach(node => {
    const { width, height } = getSmartDimensions(node);
    g.setNode(node.id, { width, height });
  });

  const outgoingEdges = new Map<string, DiagramNode[]>();
  edges.forEach(edge => {
    if (edge.startConnection?.nodeId && edge.endConnection?.nodeId) {
      const sourceId = edge.startConnection.nodeId;
      if (!outgoingEdges.has(sourceId)) { outgoingEdges.set(sourceId, []); }
      outgoingEdges.get(sourceId)!.push(edge);
    }
  });

  edges.forEach(edge => {
    if (edge.startConnection?.nodeId && edge.endConnection?.nodeId) {
      let minlen = 1;
      let weight = 1;
      const labelLower = (edge.label || '').toLowerCase();
      const sourceNode = nodes.find(n => n.id === edge.startConnection!.nodeId);

      if (sourceNode?.type === 'diamond' || sourceNode?.type === 'decision-merge') {
        const sourceEdges = outgoingEdges.get(sourceNode.id) || [];
        const isSecondEdge = sourceEdges.length > 1 && sourceEdges[1].id === edge.id;

        let isYes = false;
        if (labelLower === 'yes' || labelLower === 'true') {
          isYes = true;
        } else if (labelLower === 'no' || labelLower === 'false') {
          isYes = false;
        } else {
          isYes = isSecondEdge;
        }

        if (isYes) {
          minlen = 1;
          weight = 1;
        } else {
          minlen = 1;
          weight = 100;
        }
      } else if (edge.type === 'line') {
        weight = 80;
      }

      g.setEdge(edge.startConnection.nodeId, edge.endConnection.nodeId, { minlen, weight });
    }
  });

  dagre.layout(g);

  // Orthogonal Flowchart Post-pass
  const mainSpine = new Set<string>();
  const graphRoots = nodes.filter(n => !edges.some(e => e.endConnection?.nodeId === n.id));

  const traverseSpine = (nodeId: string) => {
    if (mainSpine.has(nodeId)) { return; }
    mainSpine.add(nodeId);

    const outEdges = outgoingEdges.get(nodeId) || [];
    outEdges.forEach(e => {
      const labelLower = (e.label || '').toLowerCase();
      let isYes = false;
      const srcNode = nodes.find(n => n.id === e.startConnection?.nodeId);
      if (srcNode?.type === 'diamond' || srcNode?.type === 'decision-merge') {
        if (labelLower === 'yes' || labelLower === 'true') {
          isYes = true;
        } else if (labelLower === 'no' || labelLower === 'false') {
          isYes = false;
        } else {
          isYes = outEdges.length > 1 && outEdges[1].id === e.id;
        }
      }
      if (!isYes && e.endConnection?.nodeId) {
        traverseSpine(e.endConnection.nodeId);
      }
    });
  };
  graphRoots.forEach(n => traverseSpine(n.id));

  edges.forEach(edge => {
    if (edge.startConnection?.nodeId && edge.endConnection?.nodeId) {
      const sourceId = edge.startConnection.nodeId;
      const targetId = edge.endConnection.nodeId;
      const sourceNode = nodes.find(n => n.id === sourceId);
      const gSource = g.node(sourceId);
      const gTarget = g.node(targetId);
      const labelLower = (edge.label || '').toLowerCase();

      if ((sourceNode?.type === 'diamond' || sourceNode?.type === 'decision-merge') && gSource && gTarget) {
        const sourceEdges = outgoingEdges.get(sourceId) || [];
        const isSecondEdge = sourceEdges.length > 1 && sourceEdges[1].id === edge.id;

        let isYes = false;
        if (labelLower === 'yes' || labelLower === 'true') {
          isYes = true;
        } else if (labelLower === 'no' || labelLower === 'false') {
          isYes = false;
        } else {
          isYes = isSecondEdge;
        }

        if (isYes) {
          const oldX = gTarget.x;
          const oldY = gTarget.y;

          gTarget.y = gSource.y;
          gTarget.x = gSource.x + (gSource.width / 2) + 120 + (gTarget.width / 2);

          const dx = gTarget.x - oldX;
          const dy = gTarget.y - oldY;

          if (dx !== 0 || dy !== 0) {
            const visited = new Set<string>();
            const shiftSubTree = (nodeId: string) => {
              if (visited.has(nodeId) || mainSpine.has(nodeId)) { return; }
              visited.add(nodeId);

              const gn = g.node(nodeId);
              if (gn) {
                gn.x += dx;
                gn.y += dy;
              }

              const outEdges = outgoingEdges.get(nodeId) || [];
              outEdges.forEach(e => {
                if (e.endConnection?.nodeId) {
                  shiftSubTree(e.endConnection.nodeId);
                }
              });
            };

            const targetOutEdges = outgoingEdges.get(targetId) || [];
            targetOutEdges.forEach(e => {
              if (e.endConnection?.nodeId) {
                shiftSubTree(e.endConnection.nodeId);
              }
            });
          }
        } else {
          gTarget.x = gSource.x;
        }
      }
    }
  });

  // Final alignment pass
  const rootNodes = nodes.filter(n => !edges.some(e => e.endConnection?.nodeId === n.id));
  if (rootNodes.length > 0) {
    const mainX = g.node(rootNodes[0].id)?.x;
    if (mainX !== undefined) {
      nodes.forEach(n => {
        if (n.type === 'terminator' || n.type === 'decision-merge') {
          const gn = g.node(n.id);
          if (gn) { gn.x = mainX; }
        }
      });
    }
  }

  // Force undirected lines to align
  edges.forEach(edge => {
    if (edge.type === 'line' && edge.arrowType === 'none' &&
        edge.startConnection?.nodeId && edge.endConnection?.nodeId) {
      const gSource = g.node(edge.startConnection.nodeId);
      const gTarget = g.node(edge.endConnection.nodeId);
      if (gSource && gTarget) {
        gTarget.x = gSource.x;
      }
    }
  });

  // Apply layout to nodes
  const layoutedNodes: any[] = nodes.map(node => {
    if (!isEdge(node)) {
      const dagreNode = g.node(node.id);
      if (dagreNode) {
        const { width, height } = getSmartDimensions(node);

        return {
          ...node,
          dimensions: { width, height },
          position: {
            x: Math.round(dagreNode.x - width / 2),
            y: Math.round(dagreNode.y - height / 2)
          }
        };
      }
    }
    return node;
  });

  // Calculate edge start/end points
  return layoutedNodes.map((node: any) => {
    if (isEdge(node)) {
      node.startPoint = node.startPoint || { x: 0, y: 0 };
      node.endPoint = node.endPoint || { x: 100, y: 100 };

      if (node.startConnection?.nodeId && node.endConnection?.nodeId) {
        const sourceNode = layoutedNodes.find((n: any) => n.id === node.startConnection!.nodeId);
        const targetNode = layoutedNodes.find((n: any) => n.id === node.endConnection!.nodeId);

        if (sourceNode && targetNode) {
          const isUndirected = node.type === 'line' && node.arrowType === 'none';
          node.routing = isUndirected ? 'straight' : 'elbow';

          const labelLower = (node.label || '').toLowerCase();

          if (sourceNode.type === 'diamond' || sourceNode.type === 'decision-merge') {
            const sourceEdges = outgoingEdges.get(sourceNode.id) || [];
            const isSecondEdge = sourceEdges.length > 1 && sourceEdges[1].id === node.id;

            let isYes = false;
            if (labelLower === 'yes' || labelLower === 'true') { isYes = true; }
            else if (labelLower === 'no' || labelLower === 'false') { isYes = false; }
            else { isYes = isSecondEdge; }

            if (isYes) {
              node.startConnection.anchor = 'right';
              node.endConnection.anchor = 'left';
            } else {
              node.startConnection.anchor = 'bottom';
              node.endConnection.anchor = 'top';
            }
          } else {
            node.startConnection.anchor = 'bottom';
            node.endConnection.anchor = 'top';
          }

          if (node.startConnection.anchor === 'right') {
            node.startPoint = {
              x: sourceNode.position.x + sourceNode.dimensions.width,
              y: sourceNode.position.y + (sourceNode.dimensions.height / 2)
            };
          } else {
            node.startPoint = {
              x: sourceNode.position.x + (sourceNode.dimensions.width / 2),
              y: sourceNode.position.y + sourceNode.dimensions.height
            };
          }

          if (node.endConnection.anchor === 'left') {
            node.endPoint = {
              x: targetNode.position.x,
              y: targetNode.position.y + (targetNode.dimensions.height / 2)
            };
          } else {
            node.endPoint = {
              x: targetNode.position.x + (targetNode.dimensions.width / 2),
              y: targetNode.position.y
            };
          }
        }
      }

      node.position = {
        x: Math.min(node.startPoint.x, node.endPoint.x),
        y: Math.min(node.startPoint.y, node.endPoint.y)
      };
      node.dimensions = {
        width: Math.max(15, Math.abs(node.endPoint.x - node.startPoint.x)),
        height: Math.max(15, Math.abs(node.endPoint.y - node.startPoint.y))
      };
    }
    return node;
  });
}
