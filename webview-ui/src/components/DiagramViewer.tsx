import { useEffect, useState } from 'react';
import NodeRenderer from './NodeRenderer';
import EdgeRenderer from './EdgeRenderer';

export default function DiagramViewer({ diagram }: { diagram: any }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const nodes = diagram?.nodes || [];
  const realNodes = nodes.filter((n: any) => n.type !== 'arrow' && n.type !== 'line');
  const edges = nodes.filter((n: any) => n.type === 'arrow' || n.type === 'line');

  // Center the diagram initially
  useEffect(() => {
    if (realNodes.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      realNodes.forEach((n: any) => {
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.y < minY) minY = n.position.y;
        if (n.position.x + n.dimensions.width > maxX) maxX = n.position.x + n.dimensions.width;
        if (n.position.y + n.dimensions.height > maxY) maxY = n.position.y + n.dimensions.height;
      });
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setOffset({ x: window.innerWidth / 2 - cx, y: window.innerHeight / 2 - cy });
    }
  }, [diagram]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(0.1, s * zoomFactor), 5));
    } else {
      setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden', 
        position: 'relative', 
        backgroundColor: '#1e1e1e',
        backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${offset.x}px ${offset.y}px`
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div style={{
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transformOrigin: '0 0',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          {edges.map((e: any) => (
            <EdgeRenderer key={e.id} edge={e} nodes={realNodes} />
          ))}
        </svg>

        {realNodes.map((n: any) => (
          <NodeRenderer key={n.id} node={n} />
        ))}
      </div>
      
      <div style={{ position: 'absolute', bottom: 20, right: 20, color: '#fff', background: '#0008', padding: '5px 10px', borderRadius: 4 }}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
