import * as vscode from 'vscode';

interface DetectedAgent {
  extensionId: string;
  participantName: string;
  displayName: string;
  isRealParticipant: boolean; // true = registered via chatParticipants API (supports @mention)
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === 'refreshAgents') {
        const agents = this._detectInstalledAgents();
        webviewView.webview.postMessage({ type: 'agents', value: agents });
      } else if (data.type === 'generate') {
        await this._sendInstructionToAgent(data.agentName, 'architecture', data.customPrompt);
      } else if (data.type === 'generateDiagram') {
        await this._sendInstructionToAgent(data.agentName, 'diagram', data.customPrompt);
      } else if (data.type === 'toggleMermaid') {
        await this._toggleMermaidCompiler();
      }
    });
  }

  /**
   * Scans all installed extensions for those contributing chatParticipants.
   * Excludes our own extension.
   */
  private _detectInstalledAgents(): DetectedAgent[] {
    // Built-in sub-participants that are NOT standalone agents
    const INTERNAL_PARTICIPANTS = new Set([
      'vscode', 'terminal', 'workspace', 'search',
      'notebook', 'testing', 'debug', 'extensions',
      'settings', 'editor', 'output', 'scm'
    ]);

    // Language-specific participants (NOT AI agents — they just provide
    // language help within Copilot/chat, not standalone agents)
    const LANGUAGE_PARTICIPANTS = new Set([
      'ruby', 'python', 'java', 'javascript', 'typescript',
      'go', 'rust', 'csharp', 'c', 'cpp', 'php', 'swift',
      'kotlin', 'dart', 'html', 'css', 'sql', 'shell',
      'powershell', 'bash', 'r', 'scala', 'perl', 'lua',
      'elixir', 'haskell', 'clojure', 'docker', 'kubernetes'
    ]);

    // Known AI extensions that may NOT register chatParticipants
    // but still work in the chat panel or have their own panel
    const KNOWN_AI_EXTENSIONS: Record<string, { displayName: string; participantName: string }> = {
      'openai.codex': { displayName: 'OpenAI Codex', participantName: 'codex' },
      'openai.chatgpt': { displayName: 'OpenAI ChatGPT', participantName: 'chatgpt' },
      'google.geminicodeassist': { displayName: 'Gemini Code Assist', participantName: 'gemini' },
      'continue.continue': { displayName: 'Continue', participantName: 'continue' },
      'sourcegraph.cody-ai': { displayName: 'Sourcegraph Cody', participantName: 'cody' },
      'amazonwebservices.amazon-q-vscode': { displayName: 'Amazon Q', participantName: 'q' },
      'cursor.cursor-ai': { displayName: 'Cursor AI', participantName: 'cursor' },
    };

    const seen = new Set<string>();
    const agents: DetectedAgent[] = [];

    // Always add a default chat option first — uses the IDE's built-in chat
    const ideName = vscode.env.appName || 'IDE';
    agents.push({
      extensionId: 'default',
      participantName: '',
      displayName: `${ideName} Chat (built-in)`,
      isRealParticipant: false
    });

    for (const ext of vscode.extensions.all) {
      const pkg = ext.packageJSON;
      const extId = ext.id.toLowerCase();

      // Skip our own extension
      if (extId === 'arqulat.arqulat-arc-extension') { continue; }

      // Method 1: Detect via chatParticipants contribution
      if (pkg?.contributes?.chatParticipants) {
        for (const participant of pkg.contributes.chatParticipants) {
          const name = participant.name || participant.id || '';
          const nameLower = name.toLowerCase();

          // Skip internal/built-in sub-participants
          if (INTERNAL_PARTICIPANTS.has(nameLower)) { continue; }

          // Skip language-specific participants (not AI agents)
          if (LANGUAGE_PARTICIPANTS.has(nameLower)) { continue; }

          // Deduplicate by participant name
          if (seen.has(nameLower)) { continue; }
          seen.add(nameLower);

          // Log for debugging
          console.log(`[Arqulat Arc] Detected chat participant: @${name} from ${ext.id}`);

          agents.push({
            extensionId: ext.id,
            participantName: name,
            displayName: participant.fullName || participant.name || pkg.displayName || ext.id,
            isRealParticipant: true
          });
        }
      }

      // Method 2: Detect known AI extensions by extension ID
      const knownMatch = KNOWN_AI_EXTENSIONS[extId];
      if (knownMatch && !seen.has(knownMatch.participantName.toLowerCase())) {
        seen.add(knownMatch.participantName.toLowerCase());
        agents.push({
          extensionId: ext.id,
          participantName: knownMatch.participantName,
          displayName: knownMatch.displayName,
          isRealParticipant: false
        });
      }
    }

    return agents;
  }

  /**
   * Builds the full instruction prompt and sends it to the selected agent's chat.
   * Handles real chat participants (@mention routing) vs known extensions (no @mention).
   */
  private async _sendInstructionToAgent(agentName: string, mode: 'architecture' | 'diagram', customPrompt: string = '') {
    let instruction = '';

    if (mode === 'architecture') {
      instruction = this._buildArchitectureInstruction(customPrompt);
    } else {
      instruction = this._buildDiagramInstruction(customPrompt);
    }

    // Find the agent to check if it's a real participant
    const agents = this._detectInstalledAgents();
    const agent = agents.find(a => a.participantName === agentName);

    // Only use @mention for real chat participants — known extensions
    // (Codex, ChatGPT, etc.) don't support it and would just route to default
    let chatQuery: string;
    if (agent?.isRealParticipant && agentName) {
      chatQuery = `@${agentName} ${instruction}`;
    } else {
      chatQuery = instruction;
    }

    console.log(`[Arqulat Arc] Sending to: ${agentName || '(default)'}, isRealParticipant: ${agent?.isRealParticipant}, query length: ${chatQuery.length}`);

    try {
      const commands = await vscode.commands.getCommands();
      const chatCommands = commands.filter(c => c.toLowerCase().includes('chat') || c.toLowerCase().includes('panel') || c.toLowerCase().includes('copilot') || c.toLowerCase().includes('ai'));
      
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(__dirname, '..', '..', 'commands.txt'), chatCommands.join('\n'));
    } catch (e) {
      console.error('[Arqulat Arc] Failed to list commands:', e);
    }

    // Try multiple command formats for compatibility across IDE forks
    try {
      // Format 1: Antigravity IDE built-in command
      await vscode.commands.executeCommand('antigravity.sendPromptToAgentPanel', chatQuery);
    } catch {
      // Special routing for ChatGPT/Codex extensions which do not accept arguments
      if (agentName === 'codex' || agentName === 'chatgpt') {
        await vscode.env.clipboard.writeText(chatQuery);
        try {
          await vscode.commands.executeCommand('chatgpt.newChat');
        } catch {
          await vscode.commands.executeCommand('chatgpt.openSidebar');
        }
        vscode.window.showInformationMessage(
          'Instructions copied! Please paste (Ctrl+V) into the ChatGPT/Codex panel.',
          'OK'
        );
        return; // We're done for these specific extensions
      }

      try {
        // Format 2: Object argument (works in newer VS Code and some forks)
        await vscode.commands.executeCommand('workbench.action.chat.open', {
          query: chatQuery,
          isPartialQuery: false
        });
      } catch {
        try {
          // Format 3: String argument (classic VS Code)
          await vscode.commands.executeCommand('workbench.action.chat.open', chatQuery);
        } catch {
          try {
            // Format 4: Open chat first, then try to send
            await vscode.commands.executeCommand('workbench.action.chat.open');
            // Copy to clipboard as fallback
            await vscode.env.clipboard.writeText(chatQuery);
            vscode.window.showInformationMessage(
              'Instructions copied to clipboard. Paste (Ctrl+V) into the chat panel and press Enter.',
              'OK'
            );
          } catch (e) {
            console.error('[Arqulat Arc] All chat commands failed:', e);
            // Last resort: copy to clipboard
            await vscode.env.clipboard.writeText(chatQuery);
            vscode.window.showInformationMessage(
              'Instructions copied to clipboard. Open your chat panel and paste (Ctrl+V).',
              'OK'
            );
          }
        }
      }
    }
  }

  /**
   * Toggles the Mermaid Compiler setting.
   */
  private async _toggleMermaidCompiler() {
    const config = vscode.workspace.getConfiguration('arqulat');
    const currentValue = config.get<boolean>('mermaidCompiler.enabled', false);
    await config.update('mermaidCompiler.enabled', !currentValue, vscode.ConfigurationTarget.Global);
    
    // Notify the webview of the new state
    this._view?.webview.postMessage({ type: 'mermaidCompilerState', value: !currentValue });
  }

  /**
   * Builds the architecture exploration instruction.
   */
  private _buildArchitectureInstruction(customPrompt: string = ''): string {
    const prompt = [
      `I want to understand the architecture of this project. Please explore the workspace and provide a comprehensive architecture overview in JSON format.`,
      ``,
      `Follow these steps carefully:`,
      ``,
      `**STEP 1: EXPLORE THE PROJECT**`,
      `- Read the project's root files (package.json, pom.xml, go.mod, requirements.txt, Cargo.toml, etc.)`,
      `- Identify the tech stack (languages, frameworks, databases)`,
      `- Look at the folder structure to understand the project layout`,
      `- Read key entry points (main files, index files, App files)`,
      `- Identify all major services, components, modules, and their responsibilities`,
      ``,
      `**STEP 2: IDENTIFY ENTITIES & RELATIONSHIPS**`,
      `For each component/service/module found, note:`,
      `- Its name and role (e.g., "AuthService - handles JWT authentication")`,
      `- Its type: frontend, backend, database, external API, message queue, cache, etc.`,
      `- How it connects to other components (REST, gRPC, WebSocket, DB queries, message passing)`,
      `- Natural groupings/layers (Client layer, Server layer, Data layer, External Services)`,
      ``,
      `**STEP 3: OUTPUT THE ARCHITECTURE AS JSON**`,
      `Create a new markdown file (e.g., "architecture.md") and save it to the workspace.`,
      `Write the diagram specification inside that file using a standard markdown code block with "arqulat-arc" as the language.`,
      ``,
      `Format for the code block:`,
      `\`\`\`arqulat-arc`,
      `{`,
      `  "version": "1.0",`,
      `  "nodes": [`,
      `    {`,
      `      "id": "node_0",`,
      `      "type": "box",`,
      `      "content": "ComponentName",`,
      `      "position": { "x": 0, "y": 0 },`,
      `      "dimensions": { "width": 160, "height": 60 },`,
      `      "style": { "backgroundColor": "#2d2d2d", "borderColor": "#555", "color": "#fff" }`,
      `    },`,
      `    {`,
      `      "id": "edge_0",`,
      `      "type": "arrow",`,
      `      "content": "",`,
      `      "position": { "x": 0, "y": 0 },`,
      `      "dimensions": { "width": 0, "height": 0 },`,
      `      "startConnection": { "nodeId": "node_0", "anchor": "center" },`,
      `      "endConnection": { "nodeId": "node_1", "anchor": "center" },`,
      `      "label": "REST API",`,
      `      "routing": "elbow",`,
      `      "arrowHead": "filled"`,
      `    }`,
      `  ]`,
      `}`,
      `\`\`\``,
      ``,
      `CRITICAL RULES:`,
      `- EXPLORE the actual project files before generating — do NOT guess the architecture`,
      `- Every node MUST have a non-empty "content" field`,
      `- Calculate positions using a grid: x = col * 200, y = row * 100`,
      `- Include basic dimensions for nodes (e.g. { "width": 160, "height": 60 }). They will be auto-adjusted during rendering.`,
      `- Nodes that represent components must have a unique id (e.g. "node_0", "node_1")`,
      `- Nodes that represent connections must have startConnection and endConnection referencing those ids`,
      `- Use appropriate node types: box (services), database (DB), cloud (external), server (backend), pill (start/end)`,
      `- Use colors that make logical sense (group related components with similar colors)`
    ];

    if (customPrompt.trim()) {
      prompt.push(``, `User's specific request: ${customPrompt.trim()}`);
    }

    return prompt.join('\n');
  }

  /**
   * Builds the diagram generation instruction for custom descriptions.
   */
  private _buildDiagramInstruction(customPrompt: string = ''): string {
    const prompt = [
      `I need you to generate a diagram. The user will describe what they want.`,
      ``,
      `Create a new markdown file (e.g., "diagram.md") and save it to the workspace.`,
      `Write the diagram specification inside that file using a standard markdown code block with "arqulat-arc" as the language.`,
      ``,
      `Format for the code block:`,
      `\`\`\`arqulat-arc`,
      `{`,
      `  "version": "1.0",`,
      `  "nodes": [`,
      `    {`,
      `      "id": "node_0",`,
      `      "type": "box",`,
      `      "content": "ComponentName",`,
      `      "position": { "x": 0, "y": 0 },`,
      `      "dimensions": { "width": 160, "height": 60 },`,
      `      "style": { "backgroundColor": "#2d2d2d", "borderColor": "#555", "color": "#fff" }`,
      `    },`,
      `    {`,
      `      "id": "edge_0",`,
      `      "type": "arrow",`,
      `      "content": "",`,
      `      "position": { "x": 0, "y": 0 },`,
      `      "dimensions": { "width": 0, "height": 0 },`,
      `      "startConnection": { "nodeId": "node_0", "anchor": "center" },`,
      `      "endConnection": { "nodeId": "node_1", "anchor": "center" },`,
      `      "label": "REST API",`,
      `      "routing": "elbow",`,
      `      "arrowHead": "filled"`,
      `    }`,
      `  ]`,
      `}`,
      `\`\`\``,
      ``,
      `Rules:`,
      `- Decision/condition nodes use type "diamond"`,
      `- Start/End nodes use type "pill"`,
      `- Process/action nodes use type "box"`,
      `- Database/storage use type "database"`,
      `- Nodes that represent components must have a unique id (e.g. "node_0", "node_1")`,
      `- Nodes that represent connections must have startConnection and endConnection referencing those ids`,
      `- Calculate positions using a grid: x = col * 280, y = row * 140`
    ];

    if (customPrompt.trim()) {
      prompt.push(``, `Now please generate the diagram for: ${customPrompt.trim()}`);
    } else {
      prompt.push(``, `Now please generate the diagram based on the current context.`);
    }

    return prompt.join('\n');
  }

  private _getHtmlForWebview(webview?: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('arqulat');
    const isMermaidCompilerEnabled = config.get<boolean>('mermaidCompiler.enabled', false);

    // Generate a secure webview URI for the logo image
    const iconUri = webview
      ? webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'icon.png'))
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arqulat Arc</title>
  <style>
    :root {
      --arc-accent: #6366f1;
      --arc-accent-hover: #818cf8;
      --arc-accent-dim: rgba(99, 102, 241, 0.12);
      --arc-success: #22c55e;
      --arc-card-bg: var(--vscode-sideBar-background, var(--vscode-editor-background));
      --arc-card-border: var(--vscode-widget-border, rgba(255,255,255,0.06));
      --arc-card-hover: var(--vscode-list-hoverBackground, rgba(255,255,255,0.04));
      --arc-text-primary: var(--vscode-foreground);
      --arc-text-secondary: var(--vscode-descriptionForeground);
      --arc-text-muted: color-mix(in srgb, var(--vscode-descriptionForeground) 70%, transparent);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: 13px;
      color: var(--arc-text-primary);
      padding: 0;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── Header ─── */
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px 10px;
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--arc-card-bg);
    }
    .header-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      color: #fff;
      font-weight: 700;
      flex-shrink: 0;
    }
    .header-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .header-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .header-subtitle {
      font-size: 10px;
      color: var(--arc-text-muted);
      letter-spacing: 0.2px;
    }

    /* ─── Content ─── */
    .content {
      padding: 4px 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ─── Cards ─── */
    .card {
      background: var(--arc-card-bg);
      border: 1px solid var(--arc-card-border);
      border-radius: 6px;
      padding: 12px;
      transition: border-color 0.15s;
    }
    .card:hover {
      border-color: color-mix(in srgb, var(--arc-card-border) 100%, var(--arc-accent) 30%);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--arc-text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .card-title-icon {
      font-size: 13px;
      opacity: 0.7;
    }

    /* ─── Toggle ─── */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--arc-accent-dim);
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .toggle-row:hover {
      background: rgba(99, 102, 241, 0.18);
    }
    .toggle-row-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle-row-label {
      font-size: 12px;
      font-weight: 600;
    }
    .toggle-status {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 3px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .toggle-status.on {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
    }
    .toggle-status.off {
      background: rgba(255,255,255,0.06);
      color: var(--arc-text-muted);
    }
    .toggle-switch {
      position: relative;
      width: 32px;
      height: 18px;
      flex-shrink: 0;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .toggle-track {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.1);
      border-radius: 9px;
      transition: background 0.2s;
      cursor: pointer;
    }
    .toggle-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--arc-text-secondary);
      transition: transform 0.2s, background 0.2s;
    }
    .toggle-switch input:checked + .toggle-track {
      background: var(--arc-accent);
    }
    .toggle-switch input:checked + .toggle-track::after {
      transform: translateX(14px);
      background: #fff;
    }

    /* ─── Badges ─── */
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .badge {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 3px;
      background: rgba(255,255,255,0.06);
      color: var(--arc-text-muted);
      font-family: var(--vscode-editor-font-family, monospace);
      letter-spacing: 0.2px;
    }

    /* ─── Select ─── */
    .select-wrapper {
      position: relative;
    }
    .select-wrapper select {
      width: 100%;
      padding: 7px 28px 7px 10px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--arc-card-border));
      border-radius: 4px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    }
    .select-wrapper select:focus {
      outline: none;
      border-color: var(--arc-accent);
    }
    .select-wrapper::after {
      content: '▾';
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      color: var(--arc-text-muted);
      pointer-events: none;
    }

    /* ─── Textarea ─── */
    textarea {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--arc-card-border));
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 12px;
      font-family: inherit;
      resize: vertical;
      min-height: 56px;
      margin-bottom: 8px;
    }
    textarea:focus {
      outline: none;
      border-color: var(--arc-accent);
    }
    textarea::placeholder {
      color: var(--vscode-input-placeholderForeground);
      opacity: 0.7;
    }

    /* ─── Agent Info ─── */
    .agent-status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 11px;
      color: var(--arc-text-muted);
    }
    .agent-status .indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--arc-success);
      flex-shrink: 0;
    }

    /* ─── Buttons ─── */
    .action-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .btn {
      width: 100%;
      padding: 9px 14px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      transition: opacity 0.15s, transform 0.1s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: var(--arc-accent);
      color: #fff;
    }
    .btn-outline {
      background: transparent;
      color: var(--arc-text-primary);
      border: 1px solid var(--arc-card-border);
    }
    .btn-outline:hover {
      background: var(--arc-card-hover);
      border-color: var(--arc-accent);
    }
    .btn-icon {
      font-size: 13px;
    }
    .btn-ghost {
      background: transparent;
      border: none;
      color: var(--arc-text-muted);
      font-size: 11px;
      padding: 4px 8px;
      width: auto;
      display: inline-flex;
      cursor: pointer;
      border-radius: 3px;
      transition: color 0.15s, background 0.15s;
      font-family: inherit;
      font-weight: 500;
    }
    .btn-ghost:hover {
      color: var(--arc-text-primary);
      background: var(--arc-card-hover);
    }

    /* ─── Help Text ─── */
    .hint {
      font-size: 11px;
      color: var(--arc-text-muted);
      line-height: 1.55;
    }

    /* ─── Footer ─── */
    .footer {
      padding: 10px 16px;
      text-align: center;
      font-size: 10px;
      color: var(--arc-text-muted);
      opacity: 0.5;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-icon">
      <img src="${iconUri}" width="32" height="32" style="object-fit: contain; display: block;" alt="Arqulat Arc" />
    </div>
    <div class="header-text">
      <div class="header-title">Arqulat Arc</div>
      <div class="header-subtitle">Visual Architecture Layer</div>
    </div>
  </div>

  <div class="content">

    <!-- Mermaid Compiler Card -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <span class="card-title-icon">⬡</span>
          Mermaid Compiler
        </span>
        <span class="toggle-status ${isMermaidCompilerEnabled ? 'on' : 'off'}" id="mermaidStatusBadge">
          ${isMermaidCompilerEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <div class="toggle-row" id="mermaidToggleRow">
        <div class="toggle-row-left">
          <span class="toggle-row-label">Arc Renderer</span>
        </div>
        <label class="toggle-switch" onclick="event.stopPropagation()">
          <input type="checkbox" id="mermaidToggle" ${isMermaidCompilerEnabled ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
      </div>
      <p class="hint">Replace default SVG diagrams with Arc's styled renderer in Markdown preview.</p>
      <div class="badge-row">
        <span class="badge">flowchart</span>
        <span class="badge">classDiagram</span>
        <span class="badge">stateDiagram</span>
        <span class="badge">erDiagram</span>
        <span class="badge">mindmap</span>
      </div>
    </div>

    <!-- Agent Selection Card -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <span class="card-title-icon">◎</span>
          AI Agent
        </span>
        <button class="btn-ghost" id="refreshBtn">↻ Refresh</button>
      </div>
      <div class="select-wrapper">
        <select id="agentSelect">
          <option value="">Loading agents…</option>
        </select>
      </div>
      <div class="agent-status" id="agentInfo"></div>
    </div>

    <!-- Actions Card -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <span class="card-title-icon">▸</span>
          Actions
        </span>
      </div>
      
      <div class="action-group">
        <button class="btn btn-primary" id="mapBtn">
          <span class="btn-icon">⊞</span>
          Auto-Map Workspace
        </button>
        <p class="hint" style="margin-bottom: 8px;">
          Scans your entire project automatically to generate a macro-level system architecture diagram.
        </p>

        <div style="height: 1px; background: var(--arc-card-border); margin: 8px 0;"></div>

        <textarea id="customPrompt" placeholder="Required: What kind of diagram do you want? (e.g. 'Show me the auth flow', 'Draw the database schema')"></textarea>
        <button class="btn btn-outline" id="diagramBtn">
          <span class="btn-icon">◇</span>
          Generate Custom Diagram
        </button>
        <p class="hint" style="margin-top: 8px;">
          Generates a focused diagram based on your instructions and current open file.
        </p>
      </div>
    </div>

  </div>

  <div class="footer">arqulat.com</div>

  <script>
    const vscode = acquireVsCodeApi();
    let selectedAgent = '';

    // Mermaid toggle
    const mermaidToggle = document.getElementById('mermaidToggle');
    const mermaidRow = document.getElementById('mermaidToggleRow');
    const mermaidBadge = document.getElementById('mermaidStatusBadge');

    mermaidToggle.addEventListener('change', () => {
      vscode.postMessage({ type: 'toggleMermaid' });
    });
    mermaidRow.addEventListener('click', () => {
      mermaidToggle.checked = !mermaidToggle.checked;
      mermaidToggle.dispatchEvent(new Event('change'));
    });

    function updateMermaidBadge(isOn) {
      mermaidBadge.textContent = isOn ? 'ON' : 'OFF';
      mermaidBadge.className = 'toggle-status ' + (isOn ? 'on' : 'off');
    }

    // Agent selector
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refreshAgents' });
    });

    document.getElementById('agentSelect').addEventListener('change', (e) => {
      selectedAgent = e.target.value;
      updateAgentInfo();
    });

    // Action buttons
    document.getElementById('mapBtn').addEventListener('click', () => {
      if (selectedAgent === undefined || selectedAgent === null) return;
      // Auto-Map doesn't strictly need a prompt, but we'll send it if they typed something
      const customPrompt = document.getElementById('customPrompt').value;
      vscode.postMessage({ type: 'generate', agentName: selectedAgent, customPrompt });
    });

    document.getElementById('diagramBtn').addEventListener('click', () => {
      if (selectedAgent === undefined || selectedAgent === null) return;
      const customPrompt = document.getElementById('customPrompt').value;
      
      if (!customPrompt.trim()) {
        const ta = document.getElementById('customPrompt');
        ta.style.borderColor = 'var(--vscode-errorForeground)';
        ta.placeholder = 'Please enter instructions for the diagram here first!';
        setTimeout(() => ta.style.borderColor = '', 2000);
        return;
      }

      vscode.postMessage({ type: 'generateDiagram', agentName: selectedAgent, customPrompt });
    });

    function updateAgentInfo() {
      const info = document.getElementById('agentInfo');
      if (selectedAgent) {
        info.innerHTML = '<span class="indicator"></span> Using @' + selectedAgent;
      } else if (selectedAgent === '') {
        info.innerHTML = '<span class="indicator"></span> Default Chat Panel';
      } else {
        info.innerHTML = '';
      }
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'agents') {
        const select = document.getElementById('agentSelect');
        select.innerHTML = '';
        const agents = msg.value;
        if (!agents.length || (agents.length === 1 && agents[0].extensionId === 'fallback')) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'No agents detected';
          select.appendChild(opt);
          document.getElementById('agentInfo').innerHTML =
            '<span style="color:var(--vscode-errorForeground);font-size:11px;">Install Copilot, Codex, or Gemini</span>';
        } else {
          agents.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.participantName;
            opt.textContent = a.displayName + (a.participantName ? ' (@' + a.participantName + ')' : '');
            select.appendChild(opt);
          });
          selectedAgent = agents[0].participantName;
          updateAgentInfo();
        }
      } else if (msg.type === 'mermaidCompilerState') {
        mermaidToggle.checked = msg.value;
        updateMermaidBadge(msg.value);
      }
    });

    // Auto-detect on load
    vscode.postMessage({ type: 'refreshAgents' });
  </script>
</body>
</html>`;
  }
}
