# Change Log

All notable changes to the "arqulat-arc-extension" extension will be documented in this file.

## [0.2.8]
### Fixed
- **Fixed window freeze on preview:** The markdown preview now skips the expensive Dagre auto-layout pass when nodes already carry x/y positions (as all AI-generated diagrams do). Layout only runs for diagrams that explicitly have no positions.
- **Simplified diagram sizing:** Replaced JS-button zoom controls (which required unreliable preview scripts) with pure CSS `transform: scale()` computed at render time. Diagrams auto-scale to fit a 900px-wide preview pane — no buttons, no JS, no CSP issues.
- **Fixed empty diagram guard:** Added a safety check that renders a friendly error message if a diagram has no renderable nodes (e.g., edge-only blocks).

## [0.2.7]
### Fixed
- Fixed CSP (Content Security Policy) violation in markdown preview: replaced all inline `onclick` handlers and `<script>` tags with `data-arc-*` attribute-based event delegation.
- Added `media/arc-preview.js` as a registered `contributes.markdown.previewScripts` entry so it loads with the correct nonce in VS Code's CSP-protected preview, enabling the Fit / 100% / + / − zoom controls to work properly.
- Resolved the "Executing inline script violates CSP" and "Some content has been disabled" warnings in the markdown preview panel.

## [0.2.6]
### Added
- Implemented a "zoom-to-fit" responsive wrapper around the markdown preview diagrams. The diagram now automatically scales to fit within the editor's width on first load.
- Added interactive zoom controls (Fit, 100%, Zoom In, Zoom Out) directly embedded within the `arqulat-arc` diagram preview for easier inspection of large architectures.
- The diagram is now rendered internally at native resolution and scaled using CSS transforms, ensuring crisp text and borders at any zoom level without pixelation.

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
