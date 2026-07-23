export default function EdgeRenderer({ edge, nodes }: { edge: any; nodes: any[] }) {
  const sourceNode = nodes.find(n => n.id === edge.startConnection?.nodeId);
  const targetNode = nodes.find(n => n.id === edge.endConnection?.nodeId);

  if (!sourceNode || !targetNode) return null;

  const getAnchor = (node: any, anchorType: string) => {
    const cx = node.position.x + node.dimensions.width / 2;
    const cy = node.position.y + node.dimensions.height / 2;
    
    if (anchorType === 'top') return { x: cx, y: node.position.y };
    if (anchorType === 'bottom') return { x: cx, y: node.position.y + node.dimensions.height };
    if (anchorType === 'left') return { x: node.position.x, y: cy };
    if (anchorType === 'right') return { x: node.position.x + node.dimensions.width, y: cy };
    return { x: cx, y: cy }; // fallback
  };

  let sAnchor = edge.startConnection.anchor;
  let tAnchor = edge.endConnection.anchor;

  // Auto-detect 'closest'
  if (sAnchor === 'closest' || !sAnchor) {
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      sAnchor = dx > 0 ? 'right' : 'left';
      tAnchor = dx > 0 ? 'left' : 'right';
    } else {
      sAnchor = dy > 0 ? 'bottom' : 'top';
      tAnchor = dy > 0 ? 'top' : 'bottom';
    }
  }

  const startPt = getAnchor(sourceNode, sAnchor);
  const endPt = getAnchor(targetNode, tAnchor);

  // Path generation
  let d = '';
  if (edge.routing === 'straight') {
    d = `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
  } else if (edge.routing === 'curved') {
    const mx = (startPt.x + endPt.x) / 2;
    const my = (startPt.y + endPt.y) / 2;
    d = `M ${startPt.x} ${startPt.y} Q ${mx} ${startPt.y} ${mx} ${my} T ${endPt.x} ${endPt.y}`;
  } else {
    // Elbow
    if (['top', 'bottom'].includes(sAnchor) && ['top', 'bottom'].includes(tAnchor)) {
      const my = (startPt.y + endPt.y) / 2;
      d = `M ${startPt.x} ${startPt.y} L ${startPt.x} ${my} L ${endPt.x} ${my} L ${endPt.x} ${endPt.y}`;
    } else if (['left', 'right'].includes(sAnchor) && ['left', 'right'].includes(tAnchor)) {
      const mx = (startPt.x + endPt.x) / 2;
      d = `M ${startPt.x} ${startPt.y} L ${mx} ${startPt.y} L ${mx} ${endPt.y} L ${endPt.x} ${endPt.y}`;
    } else {
      // Mixed
      if (['top', 'bottom'].includes(sAnchor)) {
        d = `M ${startPt.x} ${startPt.y} L ${startPt.x} ${endPt.y} L ${endPt.x} ${endPt.y}`;
      } else {
        d = `M ${startPt.x} ${startPt.y} L ${endPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
      }
    }
  }

  const strokeDasharray = edge.lineStyle === 'dashed' ? '5,5' : edge.lineStyle === 'dotted' ? '2,2' : 'none';

  return (
    <g>
      {/* Marker Definition */}
      <defs>
        <marker id={`arrowhead-${edge.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
        </marker>
      </defs>
      
      {/* Line */}
      <path 
        d={d} 
        fill="none" 
        stroke="#888" 
        strokeWidth="2" 
        strokeDasharray={strokeDasharray}
        markerEnd={edge.arrowHead !== 'none' ? `url(#arrowhead-${edge.id})` : undefined}
      />

      {/* Label */}
      {edge.label && (
        <text 
          x={(startPt.x + endPt.x) / 2} 
          y={(startPt.y + endPt.y) / 2 - 10} 
          fill="#ccc" 
          fontSize="12"
          textAnchor="middle"
          style={{ fontFamily: 'sans-serif', background: '#222' }}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}
