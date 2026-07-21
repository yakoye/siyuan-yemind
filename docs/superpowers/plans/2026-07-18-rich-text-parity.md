# YeMind Zen v0.5.15 rich-text parity implementation plan

Date: 2026-07-18

1. Add failing tests for editor-local overlay ownership, visible edit text, palette/reset/eyedropper controls and partial outline selection.
2. Define a shared formatting-target interface and adapt canvas commands/dialogs.
3. Rebuild the toolbar as an editor-local target-aware surface with color palettes.
4. Preserve natural canvas text selection and fix upstream edit-style inheritance.
5. Preserve outline rich HTML and add one active Quill editing session.
6. Route outline formatting and commits through the shared toolbar and upstream rich-text command.
7. Run TypeScript, complete tests, production build, syntax checks, audit, ZIP CRC and extracted-entry checks.
8. Keep Windows SiYuan Settings, mouse selection, native color picker and EyeDropper as explicit manual acceptance items.
