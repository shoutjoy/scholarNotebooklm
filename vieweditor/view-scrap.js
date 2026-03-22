/* Scholar Assistant - View Scrap Editor Window */

const STORAGE_KEYS = {
  scrappedContent: 'scrappedContent',
  toMDPaste: 'scholarToMDPaste',
  previewWidth: 'viewScrapPreviewWidth',
  fontSize: 'viewScrapFontSize',
};

let previewVisible = false;

function getStorage() {
  return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;
}

async function loadScrapContent() {
  const storage = getStorage();
  if (!storage) return '';
  try {
    const data = await storage.get([STORAGE_KEYS.scrappedContent, STORAGE_KEYS.previewWidth, STORAGE_KEYS.fontSize]);
    const width = data[STORAGE_KEYS.previewWidth];
    if (typeof width === 'number') {
      document.getElementById('contentLayout')?.style.setProperty('--editor-width', `${width}%`);
    }
    applyFontSize(data[STORAGE_KEYS.fontSize]);
    return data[STORAGE_KEYS.scrappedContent] || '';
  } catch (_) {
    return '';
  }
}

async function saveScrapContent(content) {
  const storage = getStorage();
  if (storage) {
    await storage.set({ [STORAGE_KEYS.scrappedContent]: content });
  }
}

function getTextarea() {
  return document.getElementById('scrapEditArea');
}

function getContent() {
  return getTextarea()?.value || '';
}

function showMessage(text) {
  const box = document.getElementById('message-box');
  if (!box) return;
  box.textContent = text;
  box.classList.add('show');
  window.clearTimeout(box._timer);
  box._timer = window.setTimeout(() => box.classList.remove('show'), 2500);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
}

async function copyToClipboardAsync(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {}
  }
  fallbackCopy(text);
}

function downloadContent(ext) {
  const content = getContent();
  if (!content) {
    showMessage('저장할 내용이 없습니다.');
    return;
  }
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scholar_scrap_${Date.now()}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  showMessage(`${ext.toUpperCase()} 파일로 저장했습니다.`);
}

function openExternal(url) {
  const isInternal = url && url.includes('vieweditor/index.html');
  try {
    if (isInternal && typeof chrome !== 'undefined' && chrome.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 1200, height: 850 });
      return;
    }
    if (!isInternal && typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
      return;
    }
  } catch (_) {}
  window.open(url, '_blank', isInternal ? 'width=1200,height=850,resizable=yes,scrollbars=yes' : 'noopener,noreferrer');
}

function renderMarkdown() {
  const previewArea = document.getElementById('previewArea');
  if (!previewArea) return;
  const content = getContent();
  if (typeof marked !== 'undefined' && marked.parse) {
    previewArea.innerHTML = marked.parse(content || '', { breaks: true });
  } else {
    previewArea.textContent = content || '';
  }
}

function getFontSize() {
  const raw = Number(document.body?.dataset.fontSize || 13);
  return Number.isFinite(raw) ? raw : 13;
}

function applyFontSize(size) {
  const next = Math.min(24, Math.max(11, Number(size) || 13));
  document.body.dataset.fontSize = String(next);
  document.documentElement.style.setProperty('--editor-font-size', `${next}px`);
  document.documentElement.style.setProperty('--preview-font-size', `${next + 2}px`);
  const value = document.getElementById('fontSizeValue');
  if (value) value.textContent = `${next}px`;
}

async function changeFontSize(delta) {
  const next = getFontSize() + delta;
  applyFontSize(next);
  const storage = getStorage();
  if (storage) {
    await storage.set({ [STORAGE_KEYS.fontSize]: getFontSize() });
  }
}

async function saveInternal() {
  const content = getContent();
  await saveScrapContent(content);
  showMessage('내부 저장소에 저장했습니다.');
}

function snapshotEditorState() {
  const ta = getTextarea();
  const previewArea = document.getElementById('previewArea');
  return {
    textarea: ta,
    editorScrollTop: ta ? ta.scrollTop : 0,
    editorScrollLeft: ta ? ta.scrollLeft : 0,
    pageScrollX: window.scrollX,
    pageScrollY: window.scrollY,
    previewScrollTop: previewArea ? previewArea.scrollTop : 0,
  };
}

function restoreEditorState(state, selectionStart, selectionEnd = selectionStart) {
  const ta = state?.textarea;
  if (!ta) return;
  const previewArea = document.getElementById('previewArea');
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(selectionStart, selectionEnd);
  ta.scrollTop = state.editorScrollTop;
  ta.scrollLeft = state.editorScrollLeft;
  if (previewArea) {
    previewArea.scrollTop = state.previewScrollTop;
  }
  window.scrollTo(state.pageScrollX, state.pageScrollY);
}

function insertAtCursor(text) {
  const ta = getTextarea();
  if (!ta) return;
  const state = snapshotEditorState();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  const pos = start + text.length;
  renderMarkdown();
  restoreEditorState(state, pos, pos);
  saveScrapContent(ta.value);
}

function wrapSelection(before, after = before) {
  const ta = getTextarea();
  if (!ta) return;
  const state = snapshotEditorState();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || '';
  ta.value = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
  renderMarkdown();
  restoreEditorState(state, start + before.length, start + before.length + selected.length);
  saveScrapContent(ta.value);
}

function linePrefix(prefix) {
  const ta = getTextarea();
  if (!ta) return;
  const state = snapshotEditorState();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const value = ta.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const sliceEnd = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, sliceEnd);
  const next = block.split('\n').map((line) => (line.startsWith(prefix) ? line : prefix + line)).join('\n');
  ta.value = value.slice(0, lineStart) + next + value.slice(sliceEnd);
  renderMarkdown();
  restoreEditorState(state, lineStart, lineStart + next.length);
  saveScrapContent(ta.value);
}

function insertLink() {
  const ta = getTextarea();
  if (!ta) return;
  const state = snapshotEditorState();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || '링크 텍스트';
  const snippet = `[${selected}](https://)`;
  ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
  const cursor = start + snippet.length - 2;
  renderMarkdown();
  restoreEditorState(state, cursor, cursor);
  saveScrapContent(ta.value);
}

function insertImage() {
  const ta = getTextarea();
  if (!ta) return;
  const state = snapshotEditorState();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || '이미지 설명';
  const snippet = `![${selected}](https://)`;
  ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
  const cursor = start + snippet.length - 2;
  renderMarkdown();
  restoreEditorState(state, cursor, cursor);
  saveScrapContent(ta.value);
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
    case 'table': insertAtCursor('| 제목1 | 제목2 | 제목3 |\n| --- | --- | --- |\n| 내용 | 내용 | 내용 |'); break;
    case 'link': insertLink(); break;
    case 'image': insertImage(); break;
    case 'br': insertAtCursor('  \n'); break;
    default: break;
  }
}

function setPreviewVisibility(visible) {
  previewVisible = visible;
  const contentLayout = document.getElementById('contentLayout');
  const previewPanel = document.getElementById('previewPanel');
  const splitter = document.getElementById('contentSplitter');
  const btn = document.getElementById('btnTogglePreview');
  if (!contentLayout || !previewPanel || !splitter || !btn) return;
  contentLayout.classList.toggle('preview-hidden', !visible);
  previewPanel.style.display = visible ? 'flex' : 'none';
  splitter.style.display = visible ? 'block' : 'none';
  btn.textContent = visible ? '편집만' : 'MD 보기';
  if (visible) renderMarkdown();
}

function togglePreview() {
  setPreviewVisibility(!previewVisible);
}

function initSplitter() {
  const layout = document.getElementById('contentLayout');
  const splitter = document.getElementById('contentSplitter');
  const previewTitle = document.getElementById('previewTitle');
  if (!layout || !splitter || !previewTitle) return;

  const startDrag = (event) => {
    if (!previewVisible || window.innerWidth <= 900) return;
    event.preventDefault();
    splitter.classList.add('dragging');

    const onMove = async (moveEvent) => {
      const rect = layout.getBoundingClientRect();
      const offset = moveEvent.clientX - rect.left;
      const percent = Math.min(75, Math.max(25, Math.round((offset / rect.width) * 100)));
      layout.style.setProperty('--editor-width', `${percent}%`);
      const storage = getStorage();
      if (storage) {
        await storage.set({ [STORAGE_KEYS.previewWidth]: percent });
      }
    };

    const onUp = () => {
      splitter.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  splitter.addEventListener('mousedown', startDrag);
  previewTitle.addEventListener('mousedown', startDrag);
}

function confirmToMDSave(url) {
  return window.ScholarConfirm?.confirmExternalToMD?.(url, window.confirm.bind(window)) ?? window.confirm('Would you like to save this clipping?(?????? ?????????)');
}

async function sendToMD() {
  const content = getContent();
  if (!content) {
    showMessage('내용이 없습니다.');
    return;
  }
  const storage = getStorage();
  let url = 'https://mdproviewer.vercel.app/';
  if (storage) {
    await storage.set({ [STORAGE_KEYS.toMDPaste]: content });
    const data = await storage.get('tomdOpenType');
    if (data.tomdOpenType !== 'external') url = chrome.runtime.getURL('vieweditor/index.html');
  }
  if (!confirmToMDSave(url)) return false;
  await saveScrapContent(content);
  await copyToClipboardAsync(content);
  await new Promise((resolve) => setTimeout(resolve, 150));
  openExternal(url);
  showMessage('ToMD로 보냈습니다. 자동 붙여넣기 또는 Ctrl+V로 붙여넣기 하세요.');
}



if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === 'clearOnNotebookExit') window.close();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  applyFontSize(13);
  const ta = getTextarea();
  const content = await loadScrapContent();
  if (ta) {
    ta.value = content || '';
    ta.placeholder = content ? '' : '스크랩 내용이 없습니다. 스크랩 버튼으로 NotebookLM 내용을 가져오세요.';
    ta.addEventListener('input', () => {
      renderMarkdown();
      saveScrapContent(ta.value);
    });
  }

  renderMarkdown();
  setPreviewVisibility(false);
  initSplitter();

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => applyAction(button.dataset.action));
  });
  document.getElementById('btnClose')?.addEventListener('click', () => window.close());
  document.getElementById('btnSaveInternal')?.addEventListener('click', saveInternal);
  document.getElementById('btnSaveTxt')?.addEventListener('click', () => downloadContent('txt'));
  document.getElementById('btnSaveMd')?.addEventListener('click', () => downloadContent('md'));
  document.getElementById('btnTogglePreview')?.addEventListener('click', togglePreview);
  document.getElementById('btnToMD')?.addEventListener('click', sendToMD);
  document.getElementById('btnFontDown')?.addEventListener('click', () => changeFontSize(-1));
  document.getElementById('btnFontUp')?.addEventListener('click', () => changeFontSize(1));
});
