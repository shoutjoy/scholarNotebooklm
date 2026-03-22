# md_editor App Dev Plan

## Goal
- [x] Build a lightweight Chrome extension editor for Markdown.
- [x] Keep the app extension-native, simple, and fast.
- [x] Replace the old `md_viewer`-style patchwork with a cleaner structure.

## 1. Core Editor
- [x] Create the `md_editor` app shell.
- [x] Add edit and view modes.
- [x] Add markdown render preview.
- [x] Add toolbar actions.
- [x] Bold
- [x] Italic
- [x] H1
- [x] H2
- [x] H3
- [x] Quote
- [x] Table
- [x] Link
- [x] Image link
- [x] Enter as line break
- [x] Insert user info

## 2. View Controls
- [ ] Page zoom in and out.
- [x] Font zoom in and out.
- [ ] Dark and light mode toggle.

## 3. File Actions
- [x] New file.
- [x] Open file.
- [x] External MD export.
- [x] Internal storage save.
- [ ] Print.

## 4. Right Sidebar
- [ ] File tree.
- [ ] Folder creation.
- [ ] File rename.
- [ ] Search in files.
- [ ] Merge multiple documents into one.
- [ ] Backup as ZIP.
- [ ] Backup as MPV or JSON-compatible export.
- [ ] Sidebar collapse control.

## 5. Settings
- [ ] Code block background color.
- [ ] Code block text color.
- [ ] Shortcut guide.
- [ ] AI integration settings.
- [ ] API key input.
- [ ] API key acquisition link.
- [ ] AI auth gate.
- [ ] User info section.
- [ ] Save user info.
- [ ] Send Gmail request mail.
- [ ] AI tools in sidebar.
- [ ] Password check.
- [ ] ScholarAI toggle.
- [ ] sspimgAI toggle.

## 6. Extension Wiring
- [x] Route internal open actions to `md_editor`.
- [x] Keep external open actions separate.
- [x] Update popup and content entry points.
- [x] Make internal save/paste flow consistent.

## 7. Storage Strategy
- [ ] Use IndexedDB as the first storage layer.
- [x] Add fallback storage for extension-safe persistence.
- [x] Keep document list, folders, autosave, and backup data aligned.

## 8. UI Cleanup
- [x] Keep the default start state in edit mode.
- [ ] Ensure buttons do not disappear on load.
- [ ] Keep modal focus behavior stable.
- [x] Keep the layout lighter than the current editor.

## 9. Verification
- [ ] Open editor internally from NotebookLM.
- [ ] Save a document.
- [ ] Reopen saved documents.
- [ ] Export and import backup files.
- [ ] Verify toolbar actions in edit mode.
- [ ] Verify view mode rendering and zoom controls.
- [ ] Verify sidebar, settings, and AI toggles.
