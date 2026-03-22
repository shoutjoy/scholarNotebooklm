/* Scholar Assistant - View Accumulated Scraps */

const STORAGE_KEYS = {
  accumulatedScraps: 'accumulatedScraps',
  toMDPaste: 'scholarToMDPaste',
  tomdOpenType: 'tomdOpenType',
};

let accumulatedList = [];
let sidebarOpen = false;

function getItemPreviewText(content) {
  return String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderOutline(list) {
  const outline = document.getElementById('accumulated-outline');
  const count = document.getElementById('sidebar-count');
  if (!outline || !count) return;

  count.textContent = `${list.length} items`;

  if (!list.length) {
    outline.innerHTML = '<div class="sidebar-empty">No saved scraps.</div>';
    return;
  }

  outline.innerHTML = list.map((item, index) => {
    const preview = escapeHtml(getItemPreviewText(item.content).slice(0, 90) || 'No preview');
    return `
      <button class="sidebar-item" type="button" data-target-id="${item.id}">
        <span class="sidebar-item-num">#${index + 1}</span>
        <span class="sidebar-item-preview">${preview}</span>
      </button>
    `;
  }).join('');

  outline.querySelectorAll('.sidebar-item').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-target-id');
      const target = document.querySelector(`.scrap-item[data-id="${CSS.escape(String(id))}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function updateSidebarUi() {
  document.body.classList.toggle('sidebar-open', sidebarOpen);
  const toggle = document.getElementById('btnToggleSidebar');
  if (toggle) toggle.textContent = sidebarOpen ? 'Hide Outline' : 'Show Outline';
}

function toggleSidebar(force) {
  sidebarOpen = typeof force === 'boolean' ? force : !sidebarOpen;
  updateSidebarUi();
}

function getStorage() {
  return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;
}

async function getAccumulatedScraps() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const data = await storage.get(STORAGE_KEYS.accumulatedScraps);
    return data[STORAGE_KEYS.accumulatedScraps] || [];
  } catch (_) {
    return [];
  }
}

async function setAccumulatedScraps(list) {
  const storage = getStorage();
  if (!storage) return;
  await storage.set({ [STORAGE_KEYS.accumulatedScraps]: list });
}

async function getMergedContent() {
  const list = await getAccumulatedScraps();
  return list.length ? list.map((item) => item.content || '').join('\n\n---\n\n') : '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function contentEditableHtmlToText(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName;
    if (tag === 'BR') return '\n';

    let text = '';
    node.childNodes.forEach((child) => {
      text += walk(child);
    });

    if (tag === 'DIV' || tag === 'P' || tag === 'LI') {
      if (!text.endsWith('\n')) text += '\n';
    }
    return text;
  };

  return walk(wrapper)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trimEnd();
}

function insertLineBreakAtCursor() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const br = document.createElement('br');
  range.insertNode(br);

  const spacer = document.createTextNode('');
  br.parentNode?.insertBefore(spacer, br.nextSibling);

  range.setStartAfter(br);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function insertPlainTextAtCursor(text) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const fragment = document.createDocumentFragment();
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  lines.forEach((line, index) => {
    if (index > 0) fragment.appendChild(document.createElement('br'));
    if (line) fragment.appendChild(document.createTextNode(line));
  });

  range.insertNode(fragment);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function showMessage(text) {
  const box = document.getElementById('message-box');
  if (!box) return;
  box.textContent = text;
  box.classList.add('show');
  window.clearTimeout(box._timer);
  box._timer = window.setTimeout(() => box.classList.remove('show'), 2200);
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
    try { await navigator.clipboard.writeText(text); return; } catch (_) {}
  }
  fallbackCopy(text);
}

function downloadContent(ext) {
  getMergedContent().then((content) => {
    if (!content) {
      showMessage('저장된 스크랩이 없습니다.');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholar_accumulated_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage(`${ext.toUpperCase()} 파일로 저장했습니다.`);
  });
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

function confirmToMDSave(url) {
  return window.ScholarConfirm?.confirmExternalToMD?.(url, window.confirm.bind(window)) ?? window.confirm('Would you like to save this clipping?(?????? ?????????)');
}

async function sendToMD() {
  const content = await getMergedContent();
  if (!content) {
    showMessage('저장된 스크랩이 없습니다.');
    return;
  }
  const storage = getStorage();
  let url = 'https://mdproviewer.vercel.app/';
  if (storage) {
    await storage.set({ [STORAGE_KEYS.toMDPaste]: content });
    const data = await storage.get(STORAGE_KEYS.tomdOpenType);
    if (data[STORAGE_KEYS.tomdOpenType] !== 'external') url = chrome.runtime.getURL('vieweditor/index.html');
  }
  if (!confirmToMDSave(url)) return false;
  await copyToClipboardAsync(content);
  await new Promise((resolve) => setTimeout(resolve, 120));
  openExternal(url);
  showMessage('누적 스크랩을 편집기로 보냈습니다.');
}

async function deleteItem(id) {
  if (!window.confirm('Are you sure you want to delete this scrap?(? ???? ?? ?????????)')) {
    return;
  }

  const next = accumulatedList.filter((item) => String(item.id) !== String(id));
  accumulatedList = next;
  await setAccumulatedScraps(next);
  renderList(next);
  showMessage('??? ??????.');
}

async function saveItem(id) {
  const item = accumulatedList.find((entry) => String(entry.id) === String(id));
  const root = document.querySelector(`.scrap-item[data-id="${CSS.escape(String(id))}"]`);
  const body = root?.querySelector('.item-body');
  if (!item || !body) return;
  item.content = body.dataset.raw ?? contentEditableHtmlToText(body.innerHTML);
  body.dataset.raw = item.content;
  await setAccumulatedScraps(accumulatedList);
  showMessage('저장했습니다.');
}

function getItemFontSize(item) {
  const size = Number(item?.fontSize);
  return Number.isFinite(size) ? Math.min(24, Math.max(12, size)) : 16;
}

async function changeItemFontSize(id, delta) {
  const item = accumulatedList.find((entry) => String(entry.id) === String(id));
  const root = document.querySelector(`.scrap-item[data-id="${CSS.escape(String(id))}"]`);
  const body = root?.querySelector('.item-body');
  const value = root?.querySelector('.font-size-value');
  if (!item || !body || !value) return;
  item.fontSize = Math.min(24, Math.max(12, getItemFontSize(item) + delta));
  body.style.fontSize = `${item.fontSize}px`;
  value.textContent = `${item.fontSize}px`;
  await setAccumulatedScraps(accumulatedList);
}

function renderBodyAsMarkdown(body, content) {
  if (typeof marked !== 'undefined' && marked.parse) {
    body.innerHTML = marked.parse(content || '', { breaks: true });
  } else {
    body.textContent = content || '';
  }
  body.classList.add('preview');
  body.contentEditable = 'false';
}

function renderBodyAsText(body, content) {
  body.classList.remove('preview');
  body.textContent = content || '';
  body.contentEditable = 'true';
}

function toggleItemView(id) {
  const root = document.querySelector(`.scrap-item[data-id="${CSS.escape(String(id))}"]`);
  const body = root?.querySelector('.item-body');
  const btn = root?.querySelector('.btn-md');
  if (!body || !btn) return;
  const raw = body.dataset.raw ?? contentEditableHtmlToText(body.innerHTML);
  const previewing = body.dataset.mode === 'preview';
  if (previewing) {
    renderBodyAsText(body, raw);
    body.style.fontSize = `${getItemFontSize(accumulatedList.find((entry) => String(entry.id) === String(id)))}px`;
    body.dataset.mode = 'edit';
    btn.textContent = 'MD보기';
  } else {
    body.dataset.raw = raw;
    renderBodyAsMarkdown(body, raw);
    body.style.fontSize = `${getItemFontSize(accumulatedList.find((entry) => String(entry.id) === String(id))) + 1}px`;
    body.dataset.mode = 'preview';
    btn.textContent = '편집';
  }
}

function renderList(list) {
  const container = document.getElementById('accumulated-display');
  if (!container) return;

  if (!list.length) {
    container.textContent = '저장된 스크랩이 없습니다.';
    container.classList.add('content-empty');
    return;
  }

  container.classList.remove('content-empty');
  renderOutline(list);
  container.innerHTML = list.map((item, index) => {
    const raw = String(item.content || '');
    const fontSize = getItemFontSize(item);
    return `
      <div class="scrap-item" data-id="${item.id}">
        <div class="scrap-item-header">
          <div class="scrap-title">
            <span>#${index + 1}</span>
            <span class="scrap-meta">${new Date(item.ts || Date.now()).toLocaleString('ko-KR')}</span>
          </div>
          <div class="header-actions">
            <button class="btn-md" data-id="${item.id}" type="button">MD보기</button>
            <button class="btn-font" data-id="${item.id}" data-font-action="down" type="button">A-</button>
            <span class="font-size-value" style="align-self:center;min-width:36px;text-align:center;font-size:11px;color:#94a3b8;">${fontSize}px</span>
            <button class="btn-font" data-id="${item.id}" data-font-action="up" type="button">A+</button>
            <button class="btn-save" data-id="${item.id}" type="button">저장</button>
            <button class="btn-delete" data-id="${item.id}" type="button">삭제</button>
          </div>
        </div>
        <div class="item-body" data-mode="edit" data-raw="${escapeHtml(raw)}" contenteditable="true" style="font-size:${fontSize}px;">${escapeHtml(raw)}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-md').forEach((btn) => {
    btn.addEventListener('click', () => toggleItemView(btn.getAttribute('data-id')));
  });
  container.querySelectorAll('.btn-save').forEach((btn) => {
    btn.addEventListener('click', () => saveItem(btn.getAttribute('data-id')));
  });
  container.querySelectorAll('.btn-font').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = btn.getAttribute('data-font-action') === 'up' ? 1 : -1;
      changeItemFontSize(btn.getAttribute('data-id'), delta);
    });
  });
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteItem(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.item-body').forEach((body) => {
    body.addEventListener('keydown', (event) => {
      if (body.dataset.mode === 'preview') return;
      if (event.key !== 'Enter') return;

      event.preventDefault();
      insertLineBreakAtCursor();
      body.dataset.raw = contentEditableHtmlToText(body.innerHTML);
      body.dataset.mode = 'edit';
    });

    body.addEventListener('paste', (event) => {
      if (body.dataset.mode === 'preview') return;
      event.preventDefault();

      const text = event.clipboardData?.getData('text/plain') || '';
      insertPlainTextAtCursor(text);
      body.dataset.raw = contentEditableHtmlToText(body.innerHTML);
      body.dataset.mode = 'edit';
    });

    body.addEventListener('input', () => {
      body.dataset.raw = contentEditableHtmlToText(body.innerHTML);
      body.dataset.mode = 'edit';
    });
  });
}



if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === 'clearOnNotebookExit') window.close();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  accumulatedList = await getAccumulatedScraps();
  updateSidebarUi();
  renderList(accumulatedList);

  document.getElementById('btnClose')?.addEventListener('click', () => window.close());
  document.getElementById('btnToggleSidebar')?.addEventListener('click', () => toggleSidebar());
  document.getElementById('btnSaveTxt')?.addEventListener('click', () => downloadContent('txt'));
  document.getElementById('btnSaveMd')?.addEventListener('click', () => downloadContent('md'));
  document.getElementById('btnToMD')?.addEventListener('click', sendToMD);
});
