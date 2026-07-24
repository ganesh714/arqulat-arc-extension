# Arqulat Arc - Architecture Mapper

Arqulat Arc is a Visual Studio Code extension that acts as a visual architecture layer, working alongside your existing AI agents (like GitHub Copilot Chat or other AI extensions) to automatically generate, render, and edit beautiful system architecture diagrams.

## Features

- **Auto-Map Workspace**: Scans your entire project and automatically generates a comprehensive, high-level system architecture diagram showing services, databases, and dependencies.
- **Generate Custom Diagrams**: Create focused diagrams based on specific instructions and the files you currently have open.
- **Native Arc Renderer**: Intercepts `arqulat-arc` markdown code blocks and renders them beautifully inside VS Code's native Markdown Preview.
- **Bring Your Own Agent**: Integrates seamlessly with your preferred chat participant in VS Code.

## Usage

1. Open the **Arqulat Arc** panel from the Activity Bar (look for the "A" icon).
2. Ensure the **Arc Renderer** toggle is switched **ON**.
3. Select your preferred AI agent from the dropdown.
4. Click **Auto-Map Workspace** to map your whole project, or enter instructions and click **Generate Custom Diagram**.
5. Once the AI generates the `arqulat-arc` code block, insert it into any `.md` file.
6. Open VS Code's Markdown Preview (`Ctrl+Shift+V` or `Cmd+Shift+V`) to see your interactive architecture diagram!

## Requirements

You must have an AI chat extension installed (such as GitHub Copilot Chat) that registers itself as a chat participant in VS Code.

## License

This project is licensed under the MIT License.
