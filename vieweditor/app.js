const STORAGE_KEY = 'viewEditorDraft';
const DEFAULT_DOC = '';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const btnTogglePreview = document.getElementById('btnTogglePreview');
const btnRenderBottom = document.getElementById('btnRenderBottom');
const btnNewFile = document.getElementById('btnNewFile');
const btnSave = document.getElementById('btnSave');

let previewVisible = true;
let renderTimer = null;

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return {
      get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
      set: (obj) => new Promise((resolve, reject) => chrome.storage.local.set(obj, () => {
        const err = chrome.runtime?.lastError;
        if (err) reject(err);
        else resolve();
      })),
    };
  }
  return {
    get: async (keys) => {
      const out = {};
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw !== null) out[key] = raw;
        } catch (_) {}
      });
      return out;
    },
    set: async (obj) => {
      // Fallback storage path when chrome.storage.local is unavailable.
      // ViewEditor uses localStorage here so the window can still keep state.
      Object.entries(obj).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, String(value));
        } catch (_) {}
      });
    },
  };
}

const storage = getStorage();
const incomingPasteBridge = window.ViewEditorPaste?.createBridge?.({
  editor,
  renderMarkdown,
  focusEditor,
  persistDraft,
  storage
});

const PASTE_KEY = incomingPasteBridge?.PASTE_KEY || 'scholarToMDPaste';

const normalizeIncomingText = window.ViewEditorPaste?.normalizeIncomingText
  || ((t) => (typeof t === 'string' ? t.trim() : ''));

function isPasteTargetEmpty() {
  return !normalizeIncomingText(editor.value);
}

function persistDraft() {

  return storage.set({ [STORAGE_KEY]: editor.value });
}

function focusEditor() {
  editor.focus();
  const len = editor.value.length;
  editor.setSelectionRange(len, len);
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderMarkdown, 120);
}

function insertAtCursor(text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  editor.value = value.slice(0, start) + text + value.slice(end);
  const pos = start + text.length;
  editor.focus();
  editor.setSelectionRange(pos, pos);
  scheduleRender();
  persistDraft();
}

function wrapSelection(before, after = before) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  const selected = value.slice(start, end) || '';
  editor.value = value.slice(0, start) + before + selected + after + value.slice(end);
  editor.focus();
  editor.setSelectionRange(start + before.length, start + before.length + selected.length);
  scheduleRender();
  persistDraft();
}

function linePrefix(prefix) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const sliceEnd = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, sliceEnd);
  const next = block.split('\n').map((line) => (line.startsWith(prefix) ? line : prefix + line)).join('\n');
  editor.value = value.slice(0, lineStart) + next + value.slice(sliceEnd);
  editor.focus();
  editor.setSelectionRange(lineStart, lineStart + next.length);
  scheduleRender();
  persistDraft();
}

function insertLink() {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  const selected = value.slice(start, end) || '링크 텍스트';
  const snippet = `[${selected}](https://)`;
  editor.value = value.slice(0, start) + snippet + value.slice(end);
  const cursor = start + snippet.length - 2;
  editor.focus();
  editor.setSelectionRange(cursor, cursor);
  scheduleRender();
  persistDraft();
}

function insertImage() {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  const selected = value.slice(start, end) || '이미지 설명';
  const snippet = `![${selected}](https://)`;
  editor.value = value.slice(0, start) + snippet + value.slice(end);
  const cursor = start + snippet.length - 2;
  editor.focus();
  editor.setSelectionRange(cursor, cursor);
  scheduleRender();
  persistDraft();
}

function renderMarkdown() {
  if (typeof marked !== 'undefined' && marked.parse) {
    preview.innerHTML = marked.parse(editor.value || '', { breaks: true });
  } else {
    preview.textContent = editor.value || '';
  }
}

function applyAction(action) {
  switch (action) {
    case 'bold': wrapSelection('**', '**'); break;
    case 'italic': wrapSelection('*', '*'); break;
    case 'h1': linePrefix('# '); break;
    case 'h2': linePrefix('## '); break;
    case 'h3': linePrefix('### '); break;
    case 'olist': linePrefix('1. '); break;
    case 'ulist': linePrefix('- '); break;
    case 'quote': linePrefix('> '); break;
    case 'table': insertAtCursor('| 제목1 | 제목2 | 제목3 |\n| --- | --- | --- |\n| 내용 | 내용 | 내용 |'); break;
    case 'link': insertLink(); break;
    case 'image': insertImage(); break;
    case 'br': insertAtCursor('  \n'); break;
    case 'userinfo': insertAtCursor('{{userIn}}'); break;
    default: break;
  }
}

async function loadDraft() {
  if (!incomingPasteBridge) {
    try {
      const data = await storage.get([STORAGE_KEY]);
      const saved = normalizeIncomingText(data[STORAGE_KEY]);
      editor.value = saved || DEFAULT_DOC;
    } catch (_) {
      editor.value = DEFAULT_DOC;
    }
    renderMarkdown();
    return;
  }
  try {
    const data = await storage.get([STORAGE_KEY, PASTE_KEY]);
    const pasted = normalizeIncomingText(data[PASTE_KEY]);
    const saved = normalizeIncomingText(data[STORAGE_KEY]);
    if (pasted) {
      await incomingPasteBridge.applyIncomingPaste(pasted, { force: true });
    } else if (saved) {
      editor.value = saved;
      incomingPasteBridge.noteLoadedDraft(saved);
    } else {
      editor.value = DEFAULT_DOC;
      await incomingPasteBridge.pullIncomingContent({ preferClipboard: true, allowOverwrite: true });
    }
  } catch (_) {
    editor.value = DEFAULT_DOC;
    await incomingPasteBridge.pullIncomingContent({ preferClipboard: true, allowOverwrite: true });
  }
  renderMarkdown();
}

function togglePreview() {
  previewVisible = !previewVisible;
  document.body.classList.toggle('preview-hidden', !previewVisible);
  btnTogglePreview.textContent = previewVisible ? '미리보기' : '편집만';
}

editor.addEventListener('input', () => {
  scheduleRender();
  persistDraft();
});

editor.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    applyAction('bold');
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    applyAction('italic');
  }
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => applyAction(button.dataset.action));
});

btnTogglePreview.addEventListener('click', togglePreview);
btnRenderBottom.addEventListener('click', () => {
  previewVisible = true;
  document.body.classList.remove('preview-hidden');
  btnTogglePreview.textContent = '미리보기';
  renderMarkdown();
});
btnNewFile.addEventListener('click', () => {
  editor.value = '# 새 문서\n\n';
  focusEditor();
  scheduleRender();
  persistDraft();
});
btnSave.addEventListener('click', () => persistDraft());

(async function init() {
  await loadDraft();
  incomingPasteBridge?.initIncomingPasteSync?.();
  focusEditor();
  setTimeout(focusEditor, 100);
  setTimeout(focusEditor, 300);
  setTimeout(() => {
    incomingPasteBridge?.pullIncomingContent?.({
      preferClipboard: true,
      allowOverwrite: isPasteTargetEmpty()
    }).catch(() => {});
  }, 250);
  setTimeout(() => {
    incomingPasteBridge?.pullIncomingContent?.({
      preferClipboard: true,
      allowOverwrite: isPasteTargetEmpty()
    }).catch(() => {});
  }, 700);
  setTimeout(() => {
    incomingPasteBridge?.pullIncomingContent?.({
      preferClipboard: false,
      allowOverwrite: isPasteTargetEmpty(),
      respectRecentIncoming: false
    }).catch(() => {});
  }, 1200);
})();
