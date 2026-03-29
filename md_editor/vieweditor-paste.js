(function (global) {
  'use strict';

  // Shared one-time handoff key used when NotebookLM or the popup sends content
  // to ViewEditor. Keeping the key in this file makes all incoming ToMD logic
  // traceable from the paste folder.
  const PASTE_KEY = 'scholarToMDPaste';

  // Normalize text so repeated trim-only differences do not trigger unnecessary
  // re-injection or overwrite checks.
  function normalizeIncomingText(text) {
    return typeof text === 'string' ? text.trim() : '';
  }

  // Clipboard is the secondary transport path. If storage timing and window-open
  // timing do not line up, we can still recover the most recent text from here.
  // Failures are swallowed so the editor does not break on permission issues.
  async function readClipboardTextSafe() {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        return normalizeIncomingText(text);
      }
    } catch (_) {}
    return '';
  }

  function createBridge(deps) {
    // The bridge receives editor-specific hooks from vieweditor/app.js. This
    // keeps ViewEditor's UI code separate from the incoming paste pipeline.
    const { editor, renderMarkdown, focusEditor, persistDraft, storage } = deps;

    // Track the last accepted payload so repeated storage/clipboard retries do
    // not keep overwriting the same content.
    let lastIncomingText = '';
    let lastIncomingAt = 0;
    let isProcessing = false;

    // Align bridge dedup/cooldown with a draft restored from STORAGE_KEY only
    // (no PASTE_KEY round-trip through applyIncomingPaste).
    function noteLoadedDraft(text) {
      const n = normalizeIncomingText(text);
      lastIncomingText = n;
      lastIncomingAt = Date.now();
    }

    // Apply one incoming payload to the editor, refresh preview state, keep the
    // caret active, persist the draft, and clear the one-time transfer key.
    async function applyIncomingPaste(text, options = {}) {
      const normalized = normalizeIncomingText(text);
      if (!normalized || isProcessing) return false;
      if (!options.force && (normalized === normalizeIncomingText(editor.value) || normalized === lastIncomingText)) {
        return true;
      }

      isProcessing = true;
      try {
        editor.value = normalized;
        lastIncomingText = normalized;
        lastIncomingAt = Date.now();
        renderMarkdown();
        focusEditor();
        await persistDraft();

        // Clear the handoff key only after the editor is updated successfully.
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await storage.set({ [PASTE_KEY]: '' });
        }
      } catch (e) {
        console.error('[Scholar Assistant] ViewEditor paste apply error:', e);
      } finally {
        isProcessing = false;
      }
      return true;
    }

    // Pull content from storage and clipboard. The caller can prefer clipboard
    // first, allow overwrite, or respect a short cooldown after a fresh paste so
    // delayed retries do not immediately wipe newly inserted text.
    async function pullIncomingContent(options = {}) {
      const preferClipboard = options.preferClipboard === true;
      const allowOverwrite = options.allowOverwrite === true;
      const respectRecentIncoming = options.respectRecentIncoming !== false;
      const current = normalizeIncomingText(editor.value);
      if (respectRecentIncoming && lastIncomingAt && (Date.now() - lastIncomingAt) < 2500) {
        return false;
      }
      if (current && !allowOverwrite) return false;

      let storedText = '';
      try {
        const data = await storage.get([PASTE_KEY]);
        storedText = normalizeIncomingText(data?.[PASTE_KEY]);
      } catch (_) {}

      const clipboardText = await readClipboardTextSafe();
      const primary = preferClipboard ? clipboardText : storedText;
      const secondary = preferClipboard ? storedText : clipboardText;

      if (await applyIncomingPaste(primary, { force: allowOverwrite })) return true;
      if (await applyIncomingPaste(secondary, { force: allowOverwrite })) return true;
      return false;
    }

    // Keep the editor synchronized with late-arriving storage updates. This is
    // important when the ViewEditor window opens before the transfer payload is
    // fully written to extension storage.
    function initIncomingPasteSync() {
      window.addEventListener('focus', () => {
        setTimeout(focusEditor, 50);
        setTimeout(() => {
          // Only overwrite on focus when the editor is still empty.
          const isEditorEmpty = !normalizeIncomingText(editor.value);
          pullIncomingContent({
            preferClipboard: true,
            allowOverwrite: isEditorEmpty
          }).catch(() => {});
        }, 120);
      });

      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local' || isProcessing) return;
          const changed = changes[PASTE_KEY];
          if (!changed || typeof changed.newValue !== 'string') return;

          const newValue = normalizeIncomingText(changed.newValue);
          // Ignore storage clears and repeated values.
          if (!newValue || newValue === lastIncomingText) return;

          setTimeout(() => {
            applyIncomingPaste(newValue, { force: true }).catch(() => {});
          }, 50);
        });
      }
    }

    return {
      PASTE_KEY,
      applyIncomingPaste,
      pullIncomingContent,
      initIncomingPasteSync,
      noteLoadedDraft
    };
  }

  // Expose one small global so vieweditor/app.js can use the bridge without
  // carrying all transfer logic inline.
  global.ViewEditorPaste = {
    PASTE_KEY,
    createBridge,
    normalizeIncomingText
  };
})(window);
