import * as vscode from 'vscode';
import { parseMermaid, isSupportedMermaidType } from './mermaidParser';
import { renderDiagramHtml } from './diagramRenderer';

export function activate(context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(md: any) {
      const defaultFence = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => {
        const token = tokens[idx];
        const isMermaid = token.info.trim().toLowerCase() === 'mermaid';

        if (isMermaid) {
          const config = vscode.workspace.getConfiguration('arqulat');
          const isCompilerEnabled = config.get<boolean>('mermaidCompiler.enabled', false);

          if (isCompilerEnabled) {
            try {
              const code = token.content;

              // Check if it's a supported type (flowchart, class, state, er, mindmap)
              if (isSupportedMermaidType(code)) {
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
