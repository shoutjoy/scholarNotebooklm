/**
 * Scholar Assistant - NotebookLM Extension
 * Content script for https://mdproviewer.vercel.app/*
 * storage에 저장된 내용을 편집창에 자동 붙여넣기
 * 1) postMessage 2) acceptScholarPaste 3) #viewer-edit-ta 직접 주입
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'scholarToMDPaste';
  const MSG_TYPE = 'scholarToMDPaste';
  const MSG_ACK = 'scholarToMDPasteAck';
  let injected = false;

  window.addEventListener('message', (e) => {
    if (e.data?.type === MSG_ACK && !injected) {
      injected = true;
      chrome?.storage?.local?.remove?.(STORAGE_KEY);
      console.log('[Scholar Assistant] ToMD 자동 붙여넣기 완료 (ack)');
    }
  });

  function tryPostMessage(text) {
    if (!text || typeof text !== 'string') return false;
    try {
      window.postMessage({ type: MSG_TYPE, content: text, source: 'scholar-assistant' }, '*');
    } catch (_) {}
    return false;
  }

  function tryAcceptScholarPaste(text) {
    if (!text || typeof text !== 'string') return false;
    try {
      if (typeof window.acceptScholarPaste === 'function') {
        window.acceptScholarPaste(text);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function tryDirectInject(text) {
    if (!text || typeof text !== 'string') return false;

    const clickByText = (patterns) => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const found = buttons.find((btn) => {
        const label = (btn.textContent || btn.getAttribute('aria-label') || btn.title || '').trim().toLowerCase();
        return patterns.some((pattern) => label.includes(pattern));
      });
      if (found) {
        found.click();
        return true;
      }
      return false;
    };

    const assignToTextarea = (ta) => {
      ta.focus();
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const assignToContentEditable = (el) => {
      el.focus();
      try {
        document.getSelection()?.removeAllRanges?.();
      } catch (_) {}
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const findEditor = () => {
      const selectors = [
        '#viewer-edit-ta',
        '#editor',
        'textarea',
        '[contenteditable="true"]',
        '.ql-editor',
        '.CodeMirror textarea',
        '.cm-content',
        '.monaco-editor textarea'
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el || el.offsetParent === null) continue;
        return el;
      }
      return null;
    };

    clickByText(['new file', 'new', '???', '? ??']);
    clickByText(['edit', '??']);

    const editor = findEditor();
    if (!editor) return false;
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      return assignToTextarea(editor);
    }
    return assignToContentEditable(editor);
  }

  function tryInject(text) {
    if (!text || typeof text !== 'string') return false;
    tryPostMessage(text);
    if (tryAcceptScholarPaste(text)) return true;
    if (tryDirectInject(text)) return true;
    return false;
  }

  function runPaste() {
    if (injected || typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const content = data?.[STORAGE_KEY];
      if (!content) return;
      const ok = tryInject(content);
      if (ok) {
        injected = true;
        chrome.storage.local.remove(STORAGE_KEY);
        console.log('[Scholar Assistant] ToMD 자동 붙여넣기 완료');
      } else {
        navigator.clipboard?.writeText?.(content).catch(() => {});
      }
    });
  }

  function runWithRetries() {
    runPaste();
    [150, 350, 600, 1000, 1600, 2400, 3400, 4600, 6000, 7500].forEach(ms => setTimeout(runPaste, ms));
    try {
      let t;
      const obs = new MutationObserver(() => {
        if (injected) return;
        clearTimeout(t);
        t = setTimeout(runPaste, 200);
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), 12000);
    } catch (_) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => runWithRetries());
  } else {
    runWithRetries();
  }
})();
