# Change Log

All notable changes to the "arqulat-arc-extension" extension will be documented in this file.

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
