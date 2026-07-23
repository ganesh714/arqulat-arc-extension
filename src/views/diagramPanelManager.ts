import * as vscode from 'vscode';
import { ArquilatDiagram } from '../types';

export class DiagramPanelManager {
  public static currentPanel: DiagramPanelManager | undefined;
  public static readonly viewType = 'arqulat-diagram';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, diagram: ArquilatDiagram) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DiagramPanelManager.currentPanel) {
      DiagramPanelManager.currentPanel._panel.reveal(column);
      DiagramPanelManager.currentPanel.updateDiagram(diagram);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      DiagramPanelManager.viewType,
      'Architecture',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-ui', 'build')]
      }
    );

    DiagramPanelManager.currentPanel = new DiagramPanelManager(panel, extensionUri, diagram);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, diagram: ArquilatDiagram) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();
    this.updateDiagram(diagram);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public updateDiagram(diagram: ArquilatDiagram) {
    this._panel.webview.postMessage({ command: 'renderDiagram', data: diagram });
  }

  public dispose() {
    DiagramPanelManager.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', 'assets', 'index.js'));
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arqulat Arc Webview</title>
  <style>
    body { padding: 0; margin: 0; background-color: transparent; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="\${scriptUri}"></script>
</body>
</html>`;
  }
}
