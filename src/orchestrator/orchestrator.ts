import * as vscode from 'vscode';
import { ProjectContext, ArquilatDiagram, DiagramNode } from '../types';
import { SEMANTIC_PROMPT, LAYOUT_PROMPT, EXECUTE_PROMPT } from './prompts';
import { extractResultTag } from '../utils/resultExtractor';
import { CanvasApplicator } from './canvasApplicator';
import { SidebarProvider } from '../views/sidebarProvider';

export class AgentOrchestrator {
  private _model: vscode.LanguageModelChat;
  private _progress: vscode.Progress<{ message?: string; increment?: number }>;
  private _sidebar: SidebarProvider;

  constructor(model: vscode.LanguageModelChat, progress: vscode.Progress<{ message?: string; increment?: number }>, sidebar: SidebarProvider) {
    this._model = model;
    this._progress = progress;
    this._sidebar = sidebar;
  }

  public async run(context: ProjectContext): Promise<ArquilatDiagram> {
    const projectContextStr = JSON.stringify(context, null, 2);

    // Pass 1: Semantic
    this._progress.report({ message: 'Analyzing semantics...', increment: 10 });
    this._sidebar.updateStatus('Agent: Analyzing semantics...');
    const semanticMessages = [
      vscode.LanguageModelChatMessage.User(`${SEMANTIC_PROMPT}\n\nProject Context:\n${projectContextStr}`)
    ];
    let semanticRes = await this._model.sendRequest(semanticMessages, {}, new vscode.CancellationTokenSource().token);
    let semanticRaw = '';
    for await (const chunk of semanticRes.text) { semanticRaw += chunk; }
    const semanticResult = extractResultTag(semanticRaw);

    // Pass 2: Layout
    this._progress.report({ message: 'Planning layout...', increment: 20 });
    this._sidebar.updateStatus('Agent: Planning layout...');
    const layoutMessages = [
      vscode.LanguageModelChatMessage.User(`${LAYOUT_PROMPT}\n\nSemantic Analysis:\n${semanticResult}`)
    ];
    let layoutRes = await this._model.sendRequest(layoutMessages, {}, new vscode.CancellationTokenSource().token);
    let layoutRaw = '';
    for await (const chunk of layoutRes.text) { layoutRaw += chunk; }
    const layoutResult = extractResultTag(layoutRaw);

    // Pass 3: Execute Loop
    this._progress.report({ message: 'Building diagram...', increment: 30 });
    this._sidebar.updateStatus('Agent: Building diagram...');
    
    let currentCanvas: DiagramNode[] = [];
    const applicator = new CanvasApplicator();
    let isDone = false;
    let steps = 0;
    const maxSteps = 7;

    while (!isDone && steps < maxSteps) {
      steps++;
      this._sidebar.updateStatus(`Agent: Building step ${steps}...`);
      
      const executePrompt = `${EXECUTE_PROMPT}
STEP: ${steps}
SEMANTIC BLUEPRINT:
${semanticResult}
LAYOUT PLAN:
${layoutResult}
CURRENT CANVAS STATE:
${JSON.stringify(currentCanvas)}`;

      const executeMessages = [
        vscode.LanguageModelChatMessage.User(executePrompt)
      ];
      let execRes = await this._model.sendRequest(executeMessages, {}, new vscode.CancellationTokenSource().token);
      let execRaw = '';
      for await (const chunk of execRes.text) { execRaw += chunk; }
      
      try {
        const stepJsonStr = extractResultTag(execRaw).replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        const stepJson = JSON.parse(stepJsonStr);
        
        isDone = stepJson.isDone === true;
        if (stepJson.toolCalls && stepJson.toolCalls.length > 0) {
          currentCanvas = applicator.applyToolCalls(stepJson.toolCalls, currentCanvas);
        } else {
          isDone = true;
        }
      } catch (e) {
        console.error('Failed to parse step result', e);
        // Attempt to continue or break if it's completely unparseable
        break; 
      }
    }

    const diagram: ArquilatDiagram = {
      version: '1.0',
      nodes: currentCanvas
    };

    // Save to workspace as architecture.arqulat
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'architecture.arqulat');
      const content = Buffer.from(JSON.stringify(diagram, null, 2), 'utf8');
      await vscode.workspace.fs.writeFile(uri, content);
      vscode.window.showInformationMessage('Saved architecture.arqulat to workspace root.');
    }

    return diagram;
  }
}
