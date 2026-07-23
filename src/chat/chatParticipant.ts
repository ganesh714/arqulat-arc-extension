import * as vscode from 'vscode';
import { WorkspaceScanner } from '../scanner/workspaceScanner';
import { extractResultTag } from '../utils/resultExtractor';
import { CanvasApplicator } from '../orchestrator/canvasApplicator';
import { SEMANTIC_PROMPT, LAYOUT_PROMPT, EXECUTE_PROMPT } from '../orchestrator/prompts';
import { DiagramPanelManager } from '../views/diagramPanelManager';
import { DiagramNode, ArquilatDiagram } from '../types';

const PARTICIPANT_ID = 'arqulat.architect';
const MAX_STEPS = 7;

export function registerChatParticipant(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    const command = request.command;

    if (command === 'map') {
      await handleMapArchitecture(request, chatContext, stream, token, context);
    } else if (command === 'diagram') {
      await handleDiagram(request, chatContext, stream, token, context);
    } else {
      // Default: treat as a diagram request with the prompt
      if (request.prompt.toLowerCase().includes('map') || request.prompt.toLowerCase().includes('architecture')) {
        await handleMapArchitecture(request, chatContext, stream, token, context);
      } else {
        await handleDiagram(request, chatContext, stream, token, context);
      }
    }
  };

  const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'sidebar-icon.svg');

  context.subscriptions.push(participant);
}

/**
 * /map command — Scans the workspace and generates full project architecture
 */
async function handleMapArchitecture(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  context: vscode.ExtensionContext
) {
  // ─── Step 1: Scan Workspace ───
  stream.progress('Scanning workspace...');

  const scanner = new WorkspaceScanner();
  const projectContext = await scanner.scan();

  stream.markdown(`### 📁 Project Scanned\n`);
  stream.markdown(`- **Name:** ${projectContext.name}\n`);
  stream.markdown(`- **Files:** ${projectContext.totalFiles}\n`);
  stream.markdown(`- **Tech Stack:** ${projectContext.techStack.join(', ') || 'Unknown'}\n`);
  stream.markdown(`- **Dependencies:** ${projectContext.dependencies.length} packages\n\n`);

  // ─── Step 2: Semantic Analysis (Pass 1) ───
  stream.progress('Analyzing entities & relationships...');

  const models = await vscode.lm.selectChatModels({});
  if (models.length === 0) {
    stream.markdown('❌ **No language models found.** Please install a chat extension like GitHub Copilot, Codex, or Gemini Code Assist.\n');
    return;
  }
  const model = models[0];

  const semanticResult = await runPass(
    model,
    `${SEMANTIC_PROMPT}\n\nThe user wants to map the architecture of their project. Here is the project context:\n\n${JSON.stringify(projectContext, null, 2)}`,
    stream,
    token,
    'Semantic Analysis'
  );

  if (!semanticResult) {
    stream.markdown('❌ Failed to analyze project semantics.\n');
    return;
  }

  stream.markdown(`### 🧠 Semantic Analysis Complete\n`);
  stream.markdown(`Found entities and relationships. Planning layout...\n\n`);

  // ─── Step 3: Layout Planning (Pass 2) ───
  stream.progress('Planning layout...');

  const layoutResult = await runPass(
    model,
    `${LAYOUT_PROMPT}\n\nHere is the semantic analysis to lay out:\n\n${semanticResult}`,
    stream,
    token,
    'Layout Planning'
  );

  if (!layoutResult) {
    stream.markdown('❌ Failed to plan layout.\n');
    return;
  }

  stream.markdown(`### 📐 Layout Planned\n`);
  stream.markdown(`Grid positions assigned. Building diagram...\n\n`);

  // ─── Step 4: Execution Loop (Pass 3) ───
  const diagram = await runExecutionLoop(
    model, semanticResult, layoutResult, stream, token
  );

  // ─── Step 5: Render ───
  stream.progress('Rendering diagram...');

  // Save to workspace
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'architecture.arqulat');
    const content = Buffer.from(JSON.stringify(diagram, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(uri, content);
  }

  // Show in WebView
  DiagramPanelManager.createOrShow(context.extensionUri, diagram);

  const nodeCount = diagram.nodes.filter(n => n.type !== 'arrow').length;
  const edgeCount = diagram.nodes.filter(n => n.type === 'arrow').length;
  stream.markdown(`### ✅ Architecture Diagram Complete!\n`);
  stream.markdown(`- **${nodeCount}** nodes, **${edgeCount}** connections\n`);
  stream.markdown(`- Saved to \`architecture.arqulat\`\n`);
  stream.markdown(`- Opened in a new editor tab — pan & zoom to explore!\n`);
}

/**
 * /diagram command — Generates a diagram from a text description
 */
async function handleDiagram(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  context: vscode.ExtensionContext
) {
  const userPrompt = request.prompt;
  if (!userPrompt.trim()) {
    stream.markdown('Please describe the diagram you want to create. For example:\n\n');
    stream.markdown('`@arqulat /diagram flowchart for user authentication`\n');
    stream.markdown('`@arqulat /diagram system design for e-commerce`\n');
    return;
  }

  stream.progress('Analyzing your request...');

  const models = await vscode.lm.selectChatModels({});
  if (models.length === 0) {
    stream.markdown('❌ **No language models found.** Please install a chat extension like GitHub Copilot, Codex, or Gemini Code Assist.\n');
    return;
  }
  const model = models[0];

  // Pass 1: Semantic
  const semanticResult = await runPass(
    model,
    `${SEMANTIC_PROMPT}\n\nThe user's request: "${userPrompt}"`,
    stream, token, 'Semantic Analysis'
  );

  if (!semanticResult) {
    stream.markdown('❌ Failed to analyze request.\n');
    return;
  }

  stream.markdown(`### 🧠 Analysis Complete\n\n`);

  // Pass 2: Layout
  stream.progress('Planning layout...');
  const layoutResult = await runPass(
    model,
    `${LAYOUT_PROMPT}\n\nHere is the semantic analysis to lay out:\n\n${semanticResult}`,
    stream, token, 'Layout Planning'
  );

  if (!layoutResult) {
    stream.markdown('❌ Failed to plan layout.\n');
    return;
  }

  stream.markdown(`### 📐 Layout Planned\n\n`);

  // Pass 3: Execute
  const diagram = await runExecutionLoop(model, semanticResult, layoutResult, stream, token);

  // Save & Show
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'diagram.arqulat');
    const content = Buffer.from(JSON.stringify(diagram, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(uri, content);
  }

  DiagramPanelManager.createOrShow(context.extensionUri, diagram);

  const nodeCount = diagram.nodes.filter(n => n.type !== 'arrow').length;
  const edgeCount = diagram.nodes.filter(n => n.type === 'arrow').length;
  stream.markdown(`### ✅ Diagram Complete!\n`);
  stream.markdown(`- **${nodeCount}** nodes, **${edgeCount}** connections\n`);
  stream.markdown(`- Opened in a new editor tab\n`);
}

// ─── Helper: Run a single pass (Semantic or Layout) ───

async function runPass(
  model: vscode.LanguageModelChat,
  prompt: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  passName: string
): Promise<string | null> {
  try {
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await model.sendRequest(messages, {}, token);

    let raw = '';
    for await (const chunk of response.text) {
      raw += chunk;
    }

    const result = extractResultTag(raw);
    return result;
  } catch (e: any) {
    console.error(`[Arqulat] ${passName} failed:`, e);
    stream.markdown(`⚠️ ${passName} encountered an error: ${e.message}\n`);
    return null;
  }
}

// ─── Helper: Run the execution loop (Pass 3) ───

async function runExecutionLoop(
  model: vscode.LanguageModelChat,
  semanticResult: string,
  layoutResult: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<ArquilatDiagram> {
  let currentCanvas: DiagramNode[] = [];
  const applicator = new CanvasApplicator();
  let isDone = false;

  for (let step = 1; step <= MAX_STEPS && !isDone; step++) {
    stream.progress(`Building diagram (step ${step}/${MAX_STEPS})...`);

    const executePrompt = `${EXECUTE_PROMPT}
STEP: ${step}
SEMANTIC BLUEPRINT:
${semanticResult}
LAYOUT PLAN:
${layoutResult}
CURRENT CANVAS STATE:
${JSON.stringify(currentCanvas)}`;

    try {
      const messages = [vscode.LanguageModelChatMessage.User(executePrompt)];
      const response = await model.sendRequest(messages, {}, token);

      let raw = '';
      for await (const chunk of response.text) {
        raw += chunk;
      }

      // Clean up the response — strip markdown fences and extract JSON
      let jsonStr = extractResultTag(raw);
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

      const stepJson = JSON.parse(jsonStr);

      isDone = stepJson.isDone === true;

      if (stepJson.toolCalls && stepJson.toolCalls.length > 0) {
        currentCanvas = applicator.applyToolCalls(stepJson.toolCalls, currentCanvas);
        const explanation = stepJson.explanation || `Step ${step}`;
        stream.markdown(`**Step ${step}:** ${explanation} (${stepJson.toolCalls.length} operations)\n`);
      } else {
        isDone = true;
      }
    } catch (e: any) {
      console.error(`[Arqulat] Execute step ${step} failed:`, e);
      stream.markdown(`⚠️ Step ${step} encountered an error: ${e.message}\n`);
      break;
    }
  }

  return {
    version: '1.0',
    nodes: currentCanvas
  };
}
