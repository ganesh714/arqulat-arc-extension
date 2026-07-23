import * as vscode from 'vscode';
import { SidebarProvider } from '../views/sidebarProvider';
import { WorkspaceScanner } from '../scanner/workspaceScanner';
import { AgentOrchestrator } from '../orchestrator/orchestrator';
import { DiagramPanelManager } from '../views/diagramPanelManager';

export async function generateArchitectureCommand(context: vscode.ExtensionContext, sidebarProvider: SidebarProvider) {
  const model = sidebarProvider.getSelectedModel();
  if (!model) {
    vscode.window.showErrorMessage('No Language Model selected. Please install an extension like GitHub Copilot Chat.');
    return;
  }

  sidebarProvider.updateStatus('Starting architecture mapping...');

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Arqulat: Mapping Architecture",
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ increment: 0, message: "Scanning workspace..." });
      sidebarProvider.updateStatus('Scanning workspace...');
      
      const scanner = new WorkspaceScanner();
      const projectContext = await scanner.scan();

      progress.report({ increment: 10, message: "Analyzing semantics..." });
      sidebarProvider.updateStatus('Analyzing semantics...');
      
      const orchestrator = new AgentOrchestrator(model, progress, sidebarProvider);
      const diagram = await orchestrator.run(projectContext);

      progress.report({ increment: 100, message: "Rendering diagram..." });
      sidebarProvider.updateStatus('Done.');

      DiagramPanelManager.createOrShow(context.extensionUri, diagram);
    } catch (e: any) {
      vscode.window.showErrorMessage('Failed to generate architecture: ' + e.message);
      sidebarProvider.updateStatus('Error: ' + e.message);
    }
  });
}
