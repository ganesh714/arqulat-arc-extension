/**
 * Diagram Renderer — Generates pure HTML+CSS for Arc-style diagrams.
 * Used in Markdown preview (no React available).
 * Renders nodes as styled divs, edges as SVG paths.
 */
import type { DiagramNode } from '../types';

// ─── Color Palettes ─────────────────────────────────────────────────

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'box':           { bg: '#161b22', border: '#30363d', text: '#e6edf3' },
  'rounded-rect':  { bg: '#161b22', border: '#30363d', text: '#e6edf3' },
  'diamond':       { bg: '#1c1917', border: '#78716c', text: '#fbbf24' },
  'circle':        { bg: '#0c0a09', border: '#44403c', text: '#e6edf3' },
  'pill':          { bg: '#0f172a', border: '#334155', text: '#94a3b8' },
  'database':      { bg: '#0c1222', border: '#1e3a5f', text: '#7dd3fc' },
  'cloud':         { bg: '#0e1726', border: '#1e4070', text: '#60a5fa' },
  'server':        { bg: '#14120b', border: '#3f3b30', text: '#d6d3d1' },
  'uml-class':     { bg: '#161b22', border: '#30363d', text: '#e6edf3' },
  'uml-interface': { bg: '#161b22', border: '#3b82f6', text: '#93c5fd' },
  'uml-abstract':  { bg: '#161b22', border: '#a855f7', text: '#c4b5fd' },
  'uml-enum':      { bg: '#161b22', border: '#22c55e', text: '#86efac' },
  'group-frame':   { bg: 'transparent', border: '#30363d', text: '#8b949e' },
  'terminator':    { bg: '#0f172a', border: '#334155', text: '#94a3b8' },
};

function getNodeColors(type: string, style?: Record<string, string>) {
  const defaults = NODE_COLORS[type] || NODE_COLORS['box'];
  return {
    bg: style?.backgroundColor || defaults.bg,
    border: style?.borderColor || defaults.border,
    text: style?.color || style?.textColor || defaults.text,
  };
}

// ─── Node Shape CSS ─────────────────────────────────────────────────

function getShapeCss(type: string): string {
  switch (type) {
    case 'diamond':
      return 'transform: rotate(45deg); display: flex; align-items: center; justify-content: center;';
    case 'circle':
      return 'border-radius: 50%;';
    case 'pill':
    case 'terminator':
      return 'border-radius: 999px;';
    case 'rounded-rect':
      return 'border-radius: 8px;';
    case 'database':
    case 'cylinder':
      return 'border-radius: 4px 4px 12px 12px;';
    case 'cloud':
      return 'border-radius: 20px;';
    case 'group-frame':
      return 'border-radius: 8px; border-style: dashed; border-width: 2px;';
    default:
      return 'border-radius: 4px;';
  }
}

// ─── Render Single Node ─────────────────────────────────────────────

function renderNode(node: DiagramNode): string {
  const isEdge = ['arrow', 'line', 'custom-connector'].includes(node.type);
  if (isEdge) { return ''; }

  const colors = getNodeColors(node.type, node.style);
  const shapeCss = getShapeCss(node.type);

  const tagHtml = node.tag
    ? `<div style="position:absolute;top:-10px;right:8px;font-size:9px;padding:1px 6px;border-radius:3px;background:${colors.border};color:${colors.text};opacity:0.7;">${node.tag}</div>`
    : '';

  // UML sections (properties/methods)
  let sectionsHtml = '';
  if (node.sections && node.sections.length > 0) {
    sectionsHtml = node.sections.map(section =>
      `<div style="border-top:1px solid ${colors.border};padding:4px 8px;font-size:10px;text-align:left;">` +
      section.items.map(item => `<div style="padding:1px 0;font-family:monospace;font-size:10px;color:${colors.text};opacity:0.85;">${escapeHtml(item)}</div>`).join('') +
      `</div>`
    ).join('');
  }

  const contentStyle = node.type === 'diamond'
    ? 'transform: rotate(-45deg); font-size: 11px; white-space: nowrap;'
    : 'font-size: 12px;';

  return `<div style="
    position: absolute;
    left: ${node.position.x}px;
    top: ${node.position.y}px;
    width: ${node.dimensions.width}px;
    height: ${node.dimensions.height}px;
    background: ${colors.bg};
    border: 1.5px solid ${colors.border};
    color: ${colors.text};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-weight: 500;
    overflow: hidden;
    ${shapeCss}
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: box-shadow 0.2s;
  " title="${escapeHtml(node.content)}">
    ${tagHtml}
    <div style="padding: 6px 10px; text-align: center; ${contentStyle}">${escapeHtml(node.content)}</div>
    ${sectionsHtml}
  </div>`;
}

// ─── Render Edges as SVG ────────────────────────────────────────────

function renderEdges(nodes: DiagramNode[]): string {
  const isEdge = (n: DiagramNode) => ['arrow', 'line', 'custom-connector'].includes(n.type);
  const edges = nodes.filter(isEdge);
  const realNodes = nodes.filter(n => !isEdge(n));

  if (edges.length === 0) { return ''; }

  const paths = edges.map(edge => {
    const source = realNodes.find(n => n.id === edge.startConnection?.nodeId);
    const target = realNodes.find(n => n.id === edge.endConnection?.nodeId);
    if (!source || !target) { return ''; }

    // Calculate connection points
    const startAnchor = edge.startConnection?.anchor || 'bottom';
    const endAnchor = edge.endConnection?.anchor || 'top';

    let sx: number, sy: number, ex: number, ey: number;

    if (startAnchor === 'right') {
      sx = source.position.x + source.dimensions.width;
      sy = source.position.y + source.dimensions.height / 2;
    } else if (startAnchor === 'left') {
      sx = source.position.x;
      sy = source.position.y + source.dimensions.height / 2;
    } else if (startAnchor === 'top') {
      sx = source.position.x + source.dimensions.width / 2;
      sy = source.position.y;
    } else {
      sx = source.position.x + source.dimensions.width / 2;
      sy = source.position.y + source.dimensions.height;
    }

    if (endAnchor === 'left') {
      ex = target.position.x;
      ey = target.position.y + target.dimensions.height / 2;
    } else if (endAnchor === 'right') {
      ex = target.position.x + target.dimensions.width;
      ey = target.position.y + target.dimensions.height / 2;
    } else if (endAnchor === 'bottom') {
      ex = target.position.x + target.dimensions.width / 2;
      ey = target.position.y + target.dimensions.height;
    } else {
      ex = target.position.x + target.dimensions.width / 2;
      ey = target.position.y;
    }

    // Build SVG path (elbow routing)
    const routing = edge.routing || 'elbow';
    let d: string;
    if (routing === 'straight') {
      d = `M ${sx} ${sy} L ${ex} ${ey}`;
    } else {
      // Elbow routing
      const midY = (sy + ey) / 2;
      if (startAnchor === 'right' || startAnchor === 'left') {
        d = `M ${sx} ${sy} L ${ex} ${sy} L ${ex} ${ey}`;
      } else {
        d = `M ${sx} ${sy} L ${sx} ${midY} L ${ex} ${midY} L ${ex} ${ey}`;
      }
    }

    const strokeColor = '#484f58';
    const dashArray = edge.lineStyle === 'dashed' ? '6,4' : edge.lineStyle === 'dotted' ? '2,3' : '';
    const strokeWidth = edge.lineStyle === 'double' ? '3' : '1.5';

    const showArrow = edge.type === 'arrow';
    const markerId = `arrowhead_${edge.id}`;

    let markerDef = '';
    if (showArrow) {
      markerDef = `<marker id="${markerId}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="${strokeColor}" />
      </marker>`;
    }

    // Edge label
    let labelHtml = '';
    if (edge.label) {
      const labelX = (sx + ex) / 2;
      const labelY = (sy + ey) / 2;
      labelHtml = `<text x="${labelX}" y="${labelY - 6}" text-anchor="middle" fill="#8b949e" font-size="10" font-family="Inter, system-ui, sans-serif">${escapeHtml(edge.label)}</text>`;
    }

    return `${markerDef}
      <path d="${d}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none"
        ${dashArray ? `stroke-dasharray="${dashArray}"` : ''}
        ${showArrow ? `marker-end="url(#${markerId})"` : ''} />
      ${labelHtml}`;
  }).join('\n');

  return paths;
}

// ─── Main Render Function ───────────────────────────────────────────

export function renderDiagramHtml(nodes: DiagramNode[]): string {
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    if (['arrow', 'line', 'custom-connector'].includes(node.type)) { continue; }
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.dimensions.width);
    maxY = Math.max(maxY, node.position.y + node.dimensions.height);
  }

  const padding = 40;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // Shift all node positions by offset
  const shifted = nodes.map(n => ({
    ...n,
    position: {
      x: n.position.x + offsetX,
      y: n.position.y + offsetY
    }
  }));

  const nodesHtml = shifted
    .filter(n => !['arrow', 'line', 'custom-connector'].includes(n.type))
    .map(renderNode)
    .join('\n');

  const edgesSvg = renderEdges(shifted);

  return `<div class="arqulat-arc-diagram" style="
    position: relative;
    width: ${width}px;
    height: ${height}px;
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 8px;
    overflow: auto;
    margin: 16px 0;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  ">
    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
      <defs>${edgesSvg.includes('<marker') ? '' : ''}</defs>
      ${edgesSvg}
    </svg>
    <div style="position: relative; z-index: 2;">
      ${nodesHtml}
    </div>
    <div style="position: absolute; bottom: 6px; right: 10px; font-size: 9px; color: #484f58; font-family: monospace;">
      powered by Arqulat Arc
    </div>
  </div>`;
}

// ─── Utilities ──────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
