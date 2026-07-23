import { DiagramNode } from '../types';
import { mapNodeTypeAlias } from '../utils/nodeTypeMapper';

export class CanvasApplicator {
  public applyToolCalls(toolCalls: any[], currentCanvas: DiagramNode[]): DiagramNode[] {
    let nodes = JSON.parse(JSON.stringify(currentCanvas)) as DiagramNode[];
    const newNodesMap = new Map<string, string>();
    let tempIdCounter = 0;

    const resolveId = (id: string) => newNodesMap.get(id) || id;
    const createUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    for (const call of toolCalls) {
      const { tool, args } = call;
      try {
        if (tool === 'add_node') {
          const id = createUuid();
          newNodesMap.set(`$$NEW_${tempIdCounter++}$$`, id);
          const newNode: DiagramNode = {
            id,
            type: mapNodeTypeAlias(args.type || 'box'),
            content: args.content || '',
            tag: args.tag,
            position: { x: args.x || 0, y: args.y || 0 },
            dimensions: { width: args.width || 220, height: args.height || 90 },
            style: {
              ...(args.backgroundColor && { backgroundColor: args.backgroundColor }),
              ...(args.borderColor && { borderColor: args.borderColor }),
              ...(args.textColor && { color: args.textColor })
            }
          };
          nodes.push(newNode);
        } else if (tool === 'connect_nodes') {
          const sourceId = resolveId(args.sourceId);
          const targetId = resolveId(args.targetId);
          const id = createUuid();
          newNodesMap.set(`$$NEW_${tempIdCounter++}$$`, id);

          const edgeNode: DiagramNode = {
            id,
            type: 'arrow',
            content: '',
            position: { x: 0, y: 0 },
            dimensions: { width: 0, height: 0 },
            startConnection: { nodeId: sourceId, anchor: 'closest' },
            endConnection: { nodeId: targetId, anchor: 'closest' },
            label: args.label || '',
            lineStyle: args.lineStyle || 'solid',
            arrowHead: args.arrowHead || 'filled',
            routing: args.routing || 'elbow'
          };
          nodes.push(edgeNode);
        } else if (tool === 'group_nodes') {
          // Simple implementation for group
          const targetIds = (args.nodeIds || []).map((id: string) => resolveId(id));
          nodes = nodes.map(n => {
            if (targetIds.includes(n.id)) {
              return { ...n, groupId: createUuid(), groupTitle: args.groupTitle, groupColor: args.groupColor };
            }
            return n;
          });
        }
      } catch (e) {
        console.error('Failed applying tool', tool, e);
      }
    }
    return nodes;
  }
}
