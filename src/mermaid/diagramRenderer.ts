/**
 * Diagram Renderer — Generates pure HTML+CSS for Arc-style diagrams.
 * Used in Markdown preview (no React available).
 *
 * IMPORTANT: This renderer MUST produce visually identical output to
 * the web app's Node.tsx + ShapeRenderers.tsx rendering pipeline.
 * If you change shapes in the web app, mirror the changes here.
 */
import type { DiagramNode } from '../types';

// ─── Utilities ──────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getColors(node: DiagramNode) {
  const bg = node.style?.backgroundColor || '#2c2c2c';
  const border = node.style?.borderColor || '#555555';
  const text = node.style?.color || '#e3e3e3';
  const borderStyle = node.style?.borderStyle || 'solid';
  return { bg, border, text, borderStyle };
}

// ─── Render Single Node ─────────────────────────────────────────────

function renderNode(node: DiagramNode): string {
  const isEdge = ['arrow', 'line', 'custom-connector'].includes(node.type);
  if (isEdge) { return ''; }

  const { bg, border, text, borderStyle } = getColors(node);
  const content = esc(node.content || '');
  const w = node.dimensions.width;
  const h = node.dimensions.height;
  const x = node.position.x;
  const y = node.position.y;

  const basePos = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
  const textBase = `color:${text};font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:11px;font-weight:500;text-align:center;word-break:break-word;`;

  switch (node.type) {

    // ── Box (default rectangle) ──
    case 'box':
      return `<div style="${basePos}background:${bg};border:1.5px ${borderStyle} ${border};border-radius:4px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px;${textBase}">${content}</div>
      </div>`;

    // ── Rounded Rectangle ──
    case 'rounded-rect':
      return `<div style="${basePos}background:${bg};border:2px ${borderStyle} ${border};border-radius:12px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px;${textBase}">${content}</div>
      </div>`;

    // ── Pill ──
    case 'pill':
      return `<div style="${basePos}background:${bg};border:1.5px solid ${border};border-radius:999px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px 20px;${textBase}">${content}</div>
      </div>`;

    // ── Terminator ──
    case 'terminator':
      return `<div style="${basePos}background:${bg};border:2px ${borderStyle} ${border};border-radius:50px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px 20px;${textBase}">${content}</div>
      </div>`;

    // ── Diamond ── (matches web: clipPath polygon)
    case 'diamond':
      return `<div style="${basePos}display:flex;align-items:center;justify-content:center;">
        <div style="width:100%;height:100%;background:${bg};border:2px ${borderStyle} ${border};clip-path:polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
          <div style="padding:16px;text-align:center;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Decision Merge (rotated square) ──
    case 'decision-merge':
      return `<div style="${basePos}display:flex;align-items:center;justify-content:center;">
        <div style="width:70.7%;height:70.7%;transform:rotate(45deg);background:${bg};border:2px ${borderStyle} ${border};border-radius:2px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
          <div style="transform:rotate(-45deg);width:141.4%;display:flex;justify-content:center;">
            <div style="padding:4px;${textBase}">${content}</div>
          </div>
        </div>
      </div>`;

    // ── Circle ──
    case 'circle':
      return `<div style="${basePos}background:${bg};border:1.5px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px;${textBase}">${content}</div>
      </div>`;

    // ── Database ── (SVG cylinder matching web)
    case 'database':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <path d="M 5,20 C 5,10 95,10 95,20 L 95,80 C 95,90 5,90 5,80 Z" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
          <path d="M 5,20 C 5,30 95,30 95,20" fill="none" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:25%;left:0;width:100%;height:75%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:10px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Cloud ── (SVG cloud path matching web)
    case 'cloud':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <path d="M 30,90 Q 10,90 10,70 Q 10,60 20,50 Q 15,30 35,20 Q 50,5 70,20 Q 90,20 90,40 Q 100,50 95,70 Q 95,90 70,90 Z" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:15%;left:15%;width:70%;height:70%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:5px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Server / Cylinder ── (SVG cylinder with rack lines)
    case 'server':
    case 'cylinder':
      const rackLines = node.type === 'server' ? `
          <line x1="20" y1="40" x2="80" y2="40" stroke="${border}" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.5"/>
          <line x1="20" y1="55" x2="80" y2="55" stroke="${border}" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.5"/>
          <line x1="20" y1="70" x2="80" y2="70" stroke="${border}" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.5"/>
          <circle cx="25" cy="40" r="2" fill="${border}" opacity="0.7"/>
          <circle cx="25" cy="55" r="2" fill="${border}" opacity="0.7"/>
          <circle cx="25" cy="70" r="2" fill="${border}" opacity="0.7"/>` : '';
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <path d="M 5,20 L 5,80 C 5,95 95,95 95,80 L 95,20 Z" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
          <ellipse cx="50" cy="20" rx="45" ry="15" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
          ${rackLines}
        </svg>
        <div style="position:absolute;top:35%;left:10%;width:80%;height:55%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:5px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Hexagon ──
    case 'hexagon':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <polygon points="25,5 75,5 100,50 75,95 25,95 0,50" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:10px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Parallelogram ──
    case 'parallelogram':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <polygon points="20,5 100,5 80,95 0,95" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:10px 20px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── IO Data (same as parallelogram in web) ──
    case 'io-data':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <polygon points="20,5 100,5 80,95 0,95" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:10px 20px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Triangle ──
    case 'triangle':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <polygon points="50,3 97,97 3,97" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:30px 15px 15px 15px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Star ──
    case 'star':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" style="display:block;">
          <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="${bg}" stroke="${border}" stroke-width="2"/>
        </svg>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:24px 20px 20px 20px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Note ──
    case 'note': {
      const noteBg = bg !== '#2c2c2c' ? bg : '#fef3c7';
      const noteBorder = border !== '#555555' ? border : '#f59e0b';
      const noteText = text !== '#e3e3e3' ? text : '#92400e';
      return `<div style="${basePos}background:${noteBg};border:1.5px solid ${noteBorder};border-radius:2px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:12px;clip-path:polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%);position:absolute;">
        <div style="position:absolute;bottom:0;right:0;width:15%;height:15%;background:rgba(0,0,0,0.05);border-left:1px solid ${noteBorder};border-top:1px solid ${noteBorder};"></div>
        <div style="${textBase}color:${noteText};">${content}</div>
      </div>`;
    }

    // ── Process ──
    case 'process':
      return `<div style="${basePos}background:${bg};border:2px ${borderStyle} ${border};border-radius:2px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px;${textBase}">${content}</div>
      </div>`;

    // ── Queue ──
    case 'queue':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <path d="M 20,5 L 80,5 C 95,5 95,95 80,95 L 20,95 Z" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
          <ellipse cx="20" cy="50" rx="15" ry="45" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
          <line x1="40" y1="5" x2="40" y2="95" stroke="${border}" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.5"/>
          <line x1="60" y1="5" x2="60" y2="95" stroke="${border}" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.5"/>
        </svg>
        <div style="position:absolute;top:10%;left:35%;width:55%;height:80%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:5px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Document ──
    case 'document':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <path d="M 5,5 L 95,5 L 95,85 C 75,100 50,75 25,90 C 10,98 5,95 5,85 Z" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:5%;left:5%;width:90%;height:80%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:5px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Manual Input ──
    case 'manual-input':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
          <polygon points="5,25 95,5 95,95 5,95" fill="${bg}" stroke="${border}" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <div style="position:absolute;top:25%;left:5%;width:90%;height:70%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:5px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Component (UML) ──
    case 'component':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" preserveAspectRatio="none" style="display:block;">
          <rect x="10" y="0" width="calc(100% - 10px)" height="100%" fill="${bg}" stroke="${border}" stroke-width="2"/>
          <rect x="0" y="20%" width="20" height="15%" fill="${bg}" stroke="${border}" stroke-width="2"/>
          <rect x="0" y="65%" width="20" height="15%" fill="${bg}" stroke="${border}" stroke-width="2"/>
        </svg>
        <div style="position:absolute;top:0;left:20px;width:calc(100% - 20px);height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="padding:10px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Actor (stick figure) ──
    case 'actor':
      return `<div style="${basePos}">
        <svg width="100%" height="100%" viewBox="0 0 100 100" style="display:block;">
          <circle cx="50" cy="20" r="15" fill="${bg}" stroke="${border}" stroke-width="3"/>
          <line x1="50" y1="35" x2="50" y2="70" stroke="${border}" stroke-width="3"/>
          <line x1="20" y1="45" x2="80" y2="45" stroke="${border}" stroke-width="3"/>
          <line x1="50" y1="70" x2="25" y2="95" stroke="${border}" stroke-width="3"/>
          <line x1="50" y1="70" x2="75" y2="95" stroke="${border}" stroke-width="3"/>
        </svg>
        <div style="position:absolute;bottom:-20px;left:0;width:100%;text-align:center;">
          <div style="padding:2px;${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Use Case (ellipse) ──
    case 'use-case':
      return `<div style="${basePos}background:${bg};border:2px ${borderStyle} ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:12px 24px;${textBase}">${content}</div>
      </div>`;

    // ── Group Frame ──
    case 'group-frame': {
      const groupColor = (node as any).groupColor || border;
      const groupTitle = (node as any).groupTitle || '';
      const frameBg = bg !== '#2c2c2c' ? bg : 'transparent';
      return `<div style="${basePos}background:${frameBg};border:2px dashed ${groupColor};border-radius:8px;display:flex;flex-direction:column;box-sizing:border-box;">
        ${groupTitle ? `<div style="padding:8px 12px;border-bottom:2px dashed ${groupColor};font-weight:bold;${textBase}color:${groupColor};text-align:left;">${esc(groupTitle)}</div>` : ''}
        <div style="flex:1;padding:12px;"></div>
      </div>`;
    }

    // ── Callout ──
    case 'callout':
      return `<div style="${basePos}">
        <div style="width:100%;height:calc(100% - 15px);background:${bg};border:2px ${borderStyle} ${border};border-radius:4px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:8px;">
          <div style="${textBase}">${content}</div>
        </div>
        <div style="position:absolute;bottom:0;left:20px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:15px solid ${border};"></div>
        <div style="position:absolute;bottom:3px;left:22px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid ${bg};"></div>
      </div>`;

    // ── Badge ──
    case 'badge':
      return `<div style="${basePos}background:${bg};border:1px ${borderStyle} ${border};border-radius:999px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:4px 8px;${textBase}font-size:9px;font-weight:bold;">${content}</div>
      </div>`;

    // ── Browser ──
    case 'browser':
      return `<div style="${basePos}background:${bg};border:2px ${borderStyle} ${border};border-radius:4px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;">
        <div style="height:24px;background:rgba(0,0,0,0.2);border-bottom:1px solid ${border};display:flex;align-items:center;padding:0 8px;gap:4px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#eab308;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;"></div>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;">
          <div style="${textBase}">${content}</div>
        </div>
      </div>`;

    // ── Mobile ──
    case 'mobile':
      return `<div style="${basePos}background:${bg};border:3px ${borderStyle} ${border};border-radius:16px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;padding:4px;">
        <div style="align-self:center;width:30%;height:6px;background:${border};border-bottom-left-radius:4px;border-bottom-right-radius:4px;margin-bottom:4px;"></div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:4px;background:rgba(255,255,255,0.05);border-radius:10px;">
          <div style="${textBase}">${content}</div>
        </div>
        <div style="align-self:center;width:40%;height:3px;background:${border};border-radius:4px;margin-top:4px;"></div>
      </div>`;

    // ── UML Class / Interface / Abstract / Enum ──
    case 'uml-class':
    case 'uml-interface':
    case 'uml-abstract':
    case 'uml-enum': {
      const stereotypeMap: Record<string, string> = {
        'uml-interface': '&lt;&lt;Interface&gt;&gt;',
        'uml-enum': '&lt;&lt;Enum&gt;&gt;',
        'uml-abstract': '&lt;&lt;Abstract&gt;&gt;',
      };
      const isInterface = node.type === 'uml-interface';
      const isAbstract = node.type === 'uml-abstract';
      const actualBorderStyle = (isInterface || node.style?.borderStyle === 'dashed') ? 'dashed' : 'solid';
      const stereotype = (node as any).stereotype || stereotypeMap[node.type] || '';

      let sectionsHtml = '';
      if (node.sections && node.sections.length > 0) {
        sectionsHtml = node.sections.map((section, idx) =>
          `<div style="border-top:1px solid ${border};padding:6px 8px;flex:1;display:flex;flex-direction:column;justify-content:flex-start;${idx < node.sections!.length - 1 ? `border-bottom:1px solid ${border};` : ''}">` +
          (section.title ? `<div style="font-size:9px;font-weight:bold;margin-bottom:4px;color:${text};opacity:0.7;">${esc(section.title)}</div>` : '') +
          section.items.map(item => `<div style="${textBase}text-align:left;font-size:10px;padding:1px 0;">${esc(item)}</div>`).join('') +
          `</div>`
        ).join('');
      }

      return `<div style="${basePos}background:${bg};border:2px ${actualBorderStyle} ${border};border-radius:4px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;">
        <div style="padding:8px;${node.sections && node.sections.length > 0 ? `border-bottom:1px solid ${border};` : ''}display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:40px;background:rgba(0,0,0,0.1);">
          ${stereotype ? `<div style="font-size:9px;font-weight:bold;opacity:0.8;color:${text};">${stereotype}</div>` : ''}
          <div style="${textBase}font-weight:bold;${isAbstract ? 'font-style:italic;' : ''}${stereotype ? 'padding-top:4px;' : ''}">${content}</div>
        </div>
        ${sectionsHtml}
      </div>`;
    }

    // ── Custom Block (generic) ──
    case 'custom-block':
      return `<div style="${basePos}background:${bg};border-width:${node.style?.borderWidth || '1.5px'};border-style:${borderStyle};border-color:${border};border-radius:${node.style?.borderRadius || '0px'};display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:${content ? '8px' : '0'};">
        ${content ? `<div style="${textBase}">${content}</div>` : ''}
      </div>`;

    // ── Default fallback (same as box) ──
    default:
      return `<div style="${basePos}background:${bg};border:1.5px ${borderStyle} ${border};border-radius:4px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="padding:8px;${textBase}">${content}</div>
      </div>`;
  }
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

    // Calculate anchor points — matches web layoutEngine.ts
    const startAnchor = edge.startConnection?.anchor || 'bottom';
    const endAnchor = edge.endConnection?.anchor || 'top';

    let sx: number, sy: number, ex: number, ey: number;

    // Start point
    switch (startAnchor) {
      case 'right':
        sx = source.position.x + source.dimensions.width;
        sy = source.position.y + source.dimensions.height / 2;
        break;
      case 'left':
        sx = source.position.x;
        sy = source.position.y + source.dimensions.height / 2;
        break;
      case 'top':
        sx = source.position.x + source.dimensions.width / 2;
        sy = source.position.y;
        break;
      default: // bottom
        sx = source.position.x + source.dimensions.width / 2;
        sy = source.position.y + source.dimensions.height;
    }

    // End point
    switch (endAnchor) {
      case 'left':
        ex = target.position.x;
        ey = target.position.y + target.dimensions.height / 2;
        break;
      case 'right':
        ex = target.position.x + target.dimensions.width;
        ey = target.position.y + target.dimensions.height / 2;
        break;
      case 'bottom':
        ex = target.position.x + target.dimensions.width / 2;
        ey = target.position.y + target.dimensions.height;
        break;
      default: // top
        ex = target.position.x + target.dimensions.width / 2;
        ey = target.position.y;
    }

    // Build SVG path — matches web Node.tsx logic
    const routing = edge.routing || 'elbow';
    let d: string;
    if (routing === 'straight') {
      d = `M ${sx} ${sy} L ${ex} ${ey}`;
    } else if (routing === 'curved') {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const curveOffset = Math.max(15, Math.min(60, len * 0.15));
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ? dx / len : 0;
      const controlX = midX + nx * curveOffset;
      const controlY = midY + ny * curveOffset;
      d = `M ${sx} ${sy} Q ${controlX} ${controlY} ${ex} ${ey}`;
    } else {
      // Elbow routing — matches web exactly
      const isVerticalElbow = startAnchor === 'bottom' || startAnchor === 'top' || startAnchor === 'center';
      if (isVerticalElbow) {
        const midY = (sy + ey) / 2;
        d = `M ${sx} ${sy} L ${sx} ${midY} L ${ex} ${midY} L ${ex} ${ey}`;
      } else {
        // horizontal start (right/left)
        const midX = (sx + ex) / 2;
        d = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ey} L ${ex} ${ey}`;
      }
    }

    // Stroke styling — matches web Node.tsx
    const strokeColor = edge.style?.borderColor || (edge.type === 'line' ? '#888888' : '#0c8ce9');
    const dashArray = edge.lineStyle === 'dashed' ? '5,4' : edge.lineStyle === 'dotted' ? '2,2' : '';

    const showArrow = edge.type === 'arrow';
    const arrowHead = edge.arrowHead || 'filled';
    const markerId = `arrowhead_${edge.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    let markerDef = '';
    if (showArrow) {
      if (arrowHead === 'hollow') {
        markerDef = `<marker id="${markerId}" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <polygon points="0 0, 6 2.5, 0 5" fill="#ffffff" stroke="${strokeColor}" stroke-width="1"/>
        </marker>`;
      } else if (arrowHead === 'open') {
        markerDef = `<marker id="${markerId}" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <polyline points="0 0, 5 2.5, 0 5" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>
        </marker>`;
      } else {
        // filled (default)
        markerDef = `<marker id="${markerId}" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <polygon points="0 0, 6 2.5, 0 5" fill="${strokeColor}"/>
        </marker>`;
      }
    }

    // Edge label — matches web Node.tsx label positioning
    let labelHtml = '';
    if (edge.label) {
      let labelX = (sx + ex) / 2;
      let labelY = (sy + ey) / 2;
      const labelOffset = 14;

      if (routing === 'elbow') {
        const isVerticalElbow = startAnchor === 'bottom' || startAnchor === 'top' || startAnchor === 'center';
        if (isVerticalElbow) {
          const midY = (sy + ey) / 2;
          labelX = (sx + ex) / 2;
          labelY = midY - labelOffset;
        } else {
          const midX = (sx + ex) / 2;
          labelX = midX + labelOffset;
          labelY = (sy + ey) / 2;
        }
      } else if (routing === 'curved') {
        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.max(15, Math.min(60, len * 0.15));
        const nx = len > 0 ? -dy / len : 0;
        const ny = len > 0 ? dx / len : 0;
        labelX += nx * (curveOffset * 0.5);
        labelY += ny * (curveOffset * 0.5);
      } else {
        // straight
        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          labelX += (-dy / len) * labelOffset;
          labelY += (dx / len) * labelOffset;
        } else {
          labelY -= labelOffset;
        }
      }

      labelHtml = `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central" fill="#8b949e" font-size="10" font-family="Inter, system-ui, sans-serif">${esc(edge.label)}</text>`;
    }

    return `${markerDef}
      <path d="${d}" stroke="${strokeColor}" stroke-width="2" fill="none"
        ${dashArray ? `stroke-dasharray="${dashArray}"` : ''}
        ${showArrow ? `marker-end="url(#${markerId})"` : ''} />
      ${labelHtml}`;
  }).join('\n');

  return paths;
}

// ─── Main Render Function ───────────────────────────────────────────
// CSP-SAFE: Pure CSS scaling — no inline scripts, no onclick, no buttons.
// Scale is computed server-side at render time and baked directly into the style.

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

  // Guard against empty/edge-only diagrams
  if (!isFinite(minX)) { return '<p style="color:#e57373;">No diagram nodes found.</p>'; }

  const padding = 40;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // Compute scale to fit within a 900px-wide preview pane (typical markdown preview width)
  // Scale only down, never up — diagrams smaller than 900px show at 100%
  const MAX_PREVIEW_WIDTH = 900;
  const scale = Math.min(1, Math.round((MAX_PREVIEW_WIDTH / width) * 100) / 100);
  const scaledHeight = Math.ceil(height * scale);

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

  return `<div style="
    position:relative;
    width:100%;
    height:${scaledHeight}px;
    overflow-x:auto;
    overflow-y:hidden;
    background:#0d1117;
    border:1px solid #21262d;
    border-radius:8px;
    margin:16px 0;
    font-family:'Inter','Segoe UI',system-ui,sans-serif;
  ">
    <div style="
      position:relative;
      width:${width}px;
      height:${height}px;
      transform:scale(${scale});
      transform-origin:top left;
    ">
      <svg style="position:absolute;top:0;left:0;width:${width}px;height:${height}px;pointer-events:none;z-index:1;">
        ${edgesSvg}
      </svg>
      <div style="position:relative;z-index:2;">
        ${nodesHtml}
      </div>
      <div style="position:absolute;bottom:6px;right:10px;font-size:9px;color:#484f58;font-family:monospace;">
        powered by Arqulat Arc
      </div>
    </div>
    <div style="position:absolute;top:8px;right:10px;z-index:10;background:rgba(13,17,23,0.85);border:1px solid #30363d;border-radius:6px;padding:3px 8px;font-size:11px;color:#8b949e;font-family:monospace;">
      ${Math.round(scale * 100)}%
    </div>
  </div>`;
}


