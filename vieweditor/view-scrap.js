/* Scholar Assistant - View Scrap Editor Window */

const STORAGE_KEYS = {
  scrappedContent: 'scrappedContent',
  toMDPaste: 'scholarToMDPaste',
  previewWidth: 'viewScrapPreviewWidth',
  fontSize: 'viewScrapFontSize',
  specialRules: 'viewScrapSpecialRules',
};

let previewVisible = false;
let specialRules = { doubleSpaceBeforeDivider: true };

function getStorage() {
  return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;
}

async function loadScrapContent() {
  const storage = getStorage();
  if (!storage) return '';
  try {
    const data = await storage.get([STORAGE_KEYS.scrappedContent, STORAGE_KEYS.previewWidth, STORAGE_KEYS.fontSize, STORAGE_KEYS.specialRules]);
    const width = data[STORAGE_KEYS.previewWidth];
    if (typeof width === 'number') {
      document.getElementById('contentLayout')?.style.setProperty('--editor-width', `${width}%`);
    }
    applyFontSize(data[STORAGE_KEYS.fontSize]);
    applySpecialRulesState(data[STORAGE_KEYS.specialRules] || {});
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

function getCurrentRules() {
  return {
    ...(window.SpecialRuls?.DEFAULT_RULES || {}),
    ...(specialRules || {}),
  };
}

function applySpecialRulesState(nextRules = {}) {
  specialRules = {
    ...getCurrentRules(),
    ...(nextRules || {}),
  };
  const btn = document.getElementById('btnAutoHrSpace');
  if (btn) {
    const on = specialRules.doubleSpaceBeforeDivider !== false;
    btn.classList.toggle('on', on);
    btn.textContent = 'Tidy';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Tidy ON: 구분선 위에 엔터(빈 줄) 자동 삽입' : 'Tidy OFF';
  }
}

function applySpecialRulesContent(content) {
  const text = String(content || '');
  if (window.SpecialRuls?.applyRules) {
    return window.SpecialRuls.applyRules(text, getCurrentRules());
  }
  return text;
}

function getProcessedContent() {
  return applySpecialRulesContent(getContent());
}

function syncProcessedContentToTextarea() {
  const ta = getTextarea();
  if (!ta) return false;
  const before = ta.value;
  const next = applySpecialRulesContent(before);
  if (next === before) return false;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const delta = next.length - before.length;
  ta.value = next;
  ta.setSelectionRange(Math.max(0, start + delta), Math.max(0, end + delta));
  return true;
}

async function persistSpecialRules() {
  const storage = getStorage();
  if (!storage) return;
  await storage.set({ [STORAGE_KEYS.specialRules]: specialRules });
}

async function toggleTidyRule() {
  const current = getCurrentRules().doubleSpaceBeforeDivider !== false;
  applySpecialRulesState({ doubleSpaceBeforeDivider: !current });
  if (syncProcessedContentToTextarea()) {
    renderMarkdown();
    await saveScrapContent(getContent());
  }
  await persistSpecialRules();
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
  syncProcessedContentToTextarea();
  const content = getProcessedContent();
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
  const isInternal = url && url.includes('md_editor/index.html');
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
  syncProcessedContentToTextarea();
  const content = getProcessedContent();
  await saveScrapContent(content);
  showMessage('내부 저장소에 저장했습니다.');
}

async function copyEditorToClipboard() {
  syncProcessedContentToTextarea();
  const text = getProcessedContent();
  if (!String(text || '').trim()) {
    showMessage('복사할 내용이 없습니다.');
    return;
  }
  await copyToClipboardAsync(text);
  showMessage('클립보드에 복사했습니다.');
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
  syncProcessedContentToTextarea();
  const content = getProcessedContent();
  if (!content) {
    showMessage('내용이 없습니다.');
    return;
  }
  const storage = getStorage();
  let url = 'https://mdproviewer.vercel.app/';
  if (storage) {
    await storage.set({ [STORAGE_KEYS.toMDPaste]: content });
    const data = await storage.get('tomdOpenType');
    if (data.tomdOpenType !== 'external') url = chrome.runtime.getURL('md_editor/index.html');
  }
  if (!confirmToMDSave(url)) return false;
  await saveScrapContent(content);
  await copyToClipboardAsync(content);
  await new Promise((resolve) => setTimeout(resolve, 150));
  openExternal(url);
  showMessage('ToMD로 보냈습니다. 자동 붙여넣기 또는 Ctrl+V로 붙여넣기 하세요.');
}

/** MD 미리보기(#previewArea)와 동일한 렌더 결과를 단일 HTML 문서로 묶어 저장 */
function buildStandaloneHtmlFromRenderedBody(innerBodyHtml) {
  const baseStyles = `
    body { font-family: "Segoe UI", "Malgun Gothic", sans-serif; margin: 24px 32px; max-width: 52rem;
      background: #f8fafc; color: #0f172a; font-size: 15px; line-height: 1.75; }
    h1, h2, h3 { margin-top: 1.3em; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
    blockquote { margin: 12px 0; padding: 8px 12px; border-left: 4px solid #2563eb; background: #e0e7ff; color: #334155; }
    img { max-width: 100%; height: auto; }
    pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow: auto; }
    code { font-family: ui-monospace, Consolas, monospace; font-size: 0.92em; }
    pre code { font-size: inherit; }
  `;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scholar 스크랩</title>
  <style>${baseStyles}</style>
</head>
<body>
${innerBodyHtml}
</body>
</html>`;
}

function saveRenderedHtml() {
  syncProcessedContentToTextarea();
  const md = getProcessedContent();
  if (!String(md || '').trim()) {
    showMessage('저장할 내용이 없습니다.');
    return;
  }
  renderMarkdown();
  const previewArea = document.getElementById('previewArea');
  if (!previewArea) {
    showMessage('미리보기 영역을 찾을 수 없습니다.');
    return;
  }
  const inner = previewArea.innerHTML;
  const full = buildStandaloneHtmlFromRenderedBody(inner);
  const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scholar_scrap_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showMessage('렌더링된 내용을 HTML 파일로 저장했습니다.');
}



if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === 'clearOnNotebookExit') window.close();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  applyFontSize(13);
  applySpecialRulesState({ doubleSpaceBeforeDivider: true });
  const ta = getTextarea();
  const content = await loadScrapContent();
  if (ta) {
    ta.value = applySpecialRulesContent(content || '');
    ta.placeholder = content ? '' : '스크랩 내용이 없습니다. 스크랩 버튼으로 NotebookLM 내용을 가져오세요.';
    ta.addEventListener('input', () => {
      renderMarkdown();
      saveScrapContent(ta.value);
    });
    ta.addEventListener('blur', async () => {
      if (syncProcessedContentToTextarea()) {
        renderMarkdown();
        await saveScrapContent(ta.value);
      }
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
  document.getElementById('btnCopyContent')?.addEventListener('click', copyEditorToClipboard);
  document.getElementById('btnSaveTxt')?.addEventListener('click', () => downloadContent('txt'));
  document.getElementById('btnSaveMd')?.addEventListener('click', () => downloadContent('md'));
  document.getElementById('btnTogglePreview')?.addEventListener('click', togglePreview);
  document.getElementById('btnToMD')?.addEventListener('click', sendToMD);
  document.getElementById('btnSaveHtml')?.addEventListener('click', saveRenderedHtml);
  document.getElementById('btnFontDown')?.addEventListener('click', () => changeFontSize(-1));
  document.getElementById('btnFontUp')?.addEventListener('click', () => changeFontSize(1));
  document.getElementById('btnAutoHrSpace')?.addEventListener('click', toggleTidyRule);
});
