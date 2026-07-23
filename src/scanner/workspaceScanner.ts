import * as vscode from 'vscode';
import { ProjectContext } from '../types';

export class WorkspaceScanner {
  async scan(): Promise<ProjectContext> {
    const files = await vscode.workspace.findFiles(
      '**/*',
      '**/{node_modules,.git,dist,out,build,target,venv,.venv}/**'
    );
    
    let totalSize = 0;
    const treeMap: Map<string, string[]> = new Map();
    let packageJsonContent = '';
    let pomXmlContent = '';

    for (const file of files) {
      const path = vscode.workspace.asRelativePath(file);
      const parts = path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const parent = currentPath;
        currentPath = currentPath ? currentPath + '/' + parts[i] : parts[i];
        if (!treeMap.has(parent)) treeMap.set(parent, []);
        if (!treeMap.get(parent)!.includes(currentPath)) {
          treeMap.get(parent)!.push(currentPath);
        }
      }

      if (path === 'package.json') {
        const doc = await vscode.workspace.openTextDocument(file);
        packageJsonContent = doc.getText();
      } else if (path === 'pom.xml') {
        const doc = await vscode.workspace.openTextDocument(file);
        pomXmlContent = doc.getText();
      }
    }

    const techStack = this.detectTechStack(packageJsonContent, pomXmlContent);
    const dependencies = this.extractDependencies(packageJsonContent, pomXmlContent);
    
    // Generate tree string (simplified)
    const treeString = Array.from(treeMap.keys()).join('\n');

    return {
      name: vscode.workspace.name || 'Unknown Project',
      techStack,
      fileTree: treeString,
      entryPoints: [],
      dependencies,
      totalFiles: files.length
    };
  }

  private detectTechStack(pkg: string, pom: string): string[] {
    const stack = [];
    if (pkg.includes('react')) stack.push('React');
    if (pkg.includes('typescript')) stack.push('TypeScript');
    if (pkg.includes('vite')) stack.push('Vite');
    if (pom.includes('spring-boot')) stack.push('Spring Boot');
    if (pom.includes('java')) stack.push('Java');
    return stack;
  }

  private extractDependencies(pkg: string, pom: string): string[] {
    const deps = [];
    try {
      if (pkg) {
        const json = JSON.parse(pkg);
        if (json.dependencies) deps.push(...Object.keys(json.dependencies));
        if (json.devDependencies) deps.push(...Object.keys(json.devDependencies));
      }
    } catch(e) {}
    // Simplified POM extraction
    if (pom.includes('spring-boot-starter-web')) deps.push('spring-boot-starter-web');
    if (pom.includes('spring-boot-starter-data-jpa')) deps.push('spring-boot-starter-data-jpa');
    if (pom.includes('postgresql')) deps.push('postgresql');
    return deps;
  }
}
