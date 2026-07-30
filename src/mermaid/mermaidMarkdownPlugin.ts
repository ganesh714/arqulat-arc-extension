import * as vscode from 'vscode';
import { parseMermaid, isSupportedMermaidType } from './mermaidParser';
import { renderDiagramHtml } from './diagramRenderer';
import { autoLayoutNodes } from './layoutEngine';

export function activate(context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(md: any) {
      const defaultFence = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => {
        const token = tokens[idx];
        const lang = token.info.trim().toLowerCase();
        const isMermaid = lang === 'mermaid';
        const isArqulatArc = lang === 'arqulat-arc';

        if (isMermaid || isArqulatArc) {
          const config = vscode.workspace.getConfiguration('arqulat');
          const isCompilerEnabled = config.get<boolean>('mermaidCompiler.enabled', false);

          if (isCompilerEnabled || isArqulatArc) {
            try {
              const code = token.content;

              if (isArqulatArc) {
                const parsed = JSON.parse(code);
                // The new native format uses a "nodes" array directly
                if (parsed.nodes && Array.isArray(parsed.nodes)) {
                  const layoutedNodes = autoLayoutNodes(parsed.nodes);
                  return renderDiagramHtml(layoutedNodes);
                }
              }

              // Check if it's a supported type (flowchart, class, state, er, mindmap)
              if (isMermaid && isSupportedMermaidType(code)) {
                const parsedNodes = parseMermaid(code);
                
                if (parsedNodes) {
                  // Render using our custom Arc HTML/CSS renderer
                  return renderDiagramHtml(parsedNodes);
                }
              }
              // If unsupported type (e.g. gantt, sequence) or parsing fails, 
              // fall through to default rendering below.
            } catch (err) {
              console.error('Arqulat Mermaid Compiler Error:', err);
              // Fall through to default on error
            }
          }
        }

        // Default behavior (returns standard HTML or SVG depending on default mermaid renderer)
        return defaultFence(tokens, idx, options, env, self);
      };

      return md;
    }
  };
}
