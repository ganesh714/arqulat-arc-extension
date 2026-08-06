# Change Log

All notable changes to the "arqulat-arc-extension" extension will be documented in this file.
## [0.2.5]
### Fixed
- Fixed the shape vocabulary in the extension sidebar's instruction builder. Previously, it defaulted to sending only basic shapes to Copilot/Gemini (`box`, `database`, `pill`, `diamond`). It now properly requests the full rich UI library (e.g., `cloud`, `server`, `browser`, `component`, `cylinder`, `mobile`, `document`, `rounded-rect`).
- Synced the AI diagram generation shape prompts between the web app backend and the VS Code extension so both produce consistent, highly-visual architectures rather than defaulting to generic rectangles.
- The `mapNodeTypeAlias` mapping logic in `nodeTypeMapper.ts` was expanded to cleanly resolve over 40 LLM-hallucinated aliases (e.g., `internet` → `cloud`, `host` → `server`, `webapp` → `browser`) into appropriate native shape types.


## [0.2.4]
### Fixed
- Synced AI prompts with the core backend to include the 'PROXIMITY RULE' for smarter side-placement of cross-cutting layers (Network, Security).
- Synced node shape rules to properly enforce the 'database' type for database entities to prevent fallback to generic rectangles.
- Updated canvas applicator to correctly render 'terminator' types as 'pill' shapes.
- Standardized AI diagram connector lines to use a subtle palette of blue-grey shades instead of randomly colored hues.
- Fixed dimension auto-sizing calculation for smaller shapes (like 130x50) to prevent forced padding stretching.

## [0.2.3]
### Fixed
- Updated the activity bar sidebar icon to match the official Arqulat Arc logo precisely.
- Side panel header now displays the actual Arqulat logo image instead of a placeholder.

## [0.2.2]
### Added
- Replaced the placeholder text logo in the side panel header with the official Arqulat Arc logo.
- Updated the VS Code activity bar icon to a custom SVG matching the Arqulat wave design.

## [0.2.1]
### Added
- Improved side panel UI: Clearly separated the "Auto-Map Workspace" and "Generate Custom Diagram" buttons for better UX.
- Added input validation to the custom diagram generation text area to ensure users provide instructions.

### Changed
- Refactored the diagram generation logic: The AI now directly outputs the native Arqulat Arc JSON format, removing the need for intermediate tool call processing and improving reliability.

## [0.2.0]
### Added
- Initial release of the Arqulat Arc extension.
- Integration with third-party VS Code chat agents.
- Custom `arqulat-arc` markdown code block renderer using the Arc engine.
