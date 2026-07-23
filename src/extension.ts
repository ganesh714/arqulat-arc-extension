import * as vscode from 'vscode';
import { SidebarProvider } from './views/sidebarProvider';
import { activate as activateMermaidPlugin } from './mermaid/mermaidMarkdownPlugin';

export function activate(context: vscode.ExtensionContext) {
  console.log('Arqulat Arc extension is now active');

  // Register the sidebar panel
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'arqulat-sidebar',
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        }
      }
    )
  );

  // Command: opens the sidebar and focuses it
  context.subscriptions.push(
    vscode.commands.registerCommand('arqulat.generateArchitecture', () => {
      vscode.commands.executeCommand('arqulat-sidebar.focus');
    })
  );

  // Activate and return the markdown-it plugin for the Mermaid Compiler
  return activateMermaidPlugin(context);
}

export function deactivate() {}
