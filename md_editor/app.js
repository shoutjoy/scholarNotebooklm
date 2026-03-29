const WORKSPACE_KEY = 'viewEditorWorkspaceV2';
const LEGACY_DRAFT_KEY = 'viewEditorDraft';
const FONT_SIZE_KEY = 'viewEditorFontSize';
const PROFILE_KEY = 'viewEditorUserProfile';
const DEFAULT_DOC = '# 새 문서\n\n';
const MPV_FORMAT = 'VIEWEDITOR_MPV_V1';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const editorToolbar = document.getElementById('editorToolbar');

const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const btnToggleToolbar = document.getElementById('btnToggleToolbar');
const btnTogglePreview = document.getElementById('btnTogglePreview');
const btnRenderBottom = document.getElementById('btnRenderBottom');
const btnNewFile = document.getElementById('btnNewFile');
const btnNewFolder = document.getElementById('btnNewFolder');
const btnMergeSelected = document.getElementById('btnMergeSelected');
const btnBackupMpv = document.getElementById('btnBackupMpv');
const btnImportMpv = document.getElementById('btnImportMpv');
const fileImportMpv = document.getElementById('fileImportMpv');
const btnTextSmaller = document.getElementById('btnTextSmaller');
const btnTextLarger = document.getElementById('btnTextLarger');
const btnSave = document.getElementById('btnSave');
const btnSaveMd = document.getElementById('btnSaveMd');

const profileModal = document.getElementById('profileModal');
const profileNameInput = document.getElementById('profileName');
const profileOrgInput = document.getElementById('profileOrg');
const profileContactInput = document.getElementById('profileContact');
const profileEmailInput = document.getElementById('profileEmail');
const btnProfileCancel = document.getElementById('btnProfileCancel');
const btnProfileSave = document.getElementById('btnProfileSave');

const btnTabFiles = document.getElementById('btnTabFiles');
const btnTabToc = document.getElementById('btnTabToc');
const sidebarFiles = document.getElementById('sidebarFiles');
const sidebarToc = document.getElementById('sidebarToc');
const activeFolderLabel = document.getElementById('activeFolderLabel');
const fileTree = document.getElementById('fileTree');
const tocList = document.getElementById('tocList');

let previewVisible = true;
let renderTimer = null;
let activeSidebarTab = 'files';
let currentEditorFontSize = 14;
let userProfile = { name: '', org: '', contact: '', email: '' };

const state = {
  folders: [],
  documents: [],
  activeDocId: null,
  activeFolderId: 'root',
  selectedMergeDocIds: new Set()
};

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeFilename(name, fallback) {
  const base = String(name || fallback || 'document')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (base || fallback || 'document').slice(0, 80);
}

function normalizeFolderName(name) {
  const txt = String(name || '').trim();
  return txt || '새 폴더';
}

function normalizeDocTitle(name) {
  const txt = String(name || '').trim();
  return txt || '새 문서';
}

function showMessage(text) {
  try {
    window.alert(text);
  } catch (_) {}
}

function clampFontSize(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return 14;
  return Math.max(11, Math.min(24, Math.round(n)));
}

function applyEditorFontSize(size) {
  currentEditorFontSize = clampFontSize(size);
  document.documentElement.style.setProperty('--editor-font-size', `${currentEditorFontSize}px`);
  document.documentElement.style.setProperty('--preview-font-size', `${currentEditorFontSize}px`);
}

async function saveEditorFontSize() {
  await storage.set({ [FONT_SIZE_KEY]: currentEditorFontSize });
}

async function changeEditorFontSize(delta) {
  applyEditorFontSize(currentEditorFontSize + delta);
  await saveEditorFontSize();
}

function normalizeProfile(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    name: String(src.name || '').trim(),
    org: String(src.org || '').trim(),
    contact: String(src.contact || '').trim(),
    email: String(src.email || '').trim()
  };
}

function openProfileModal() {
  if (!profileModal) return;
  profileNameInput.value = userProfile.name || '';
  profileOrgInput.value = userProfile.org || '';
  profileContactInput.value = userProfile.contact || '';
  profileEmailInput.value = userProfile.email || '';
  profileModal.classList.remove('hidden');
}

function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.add('hidden');
}

async function saveProfileFromModal() {
  userProfile = normalizeProfile({
    name: profileNameInput.value,
    org: profileOrgInput.value,
    contact: profileContactInput.value,
    email: profileEmailInput.value
  });
  await storage.set({ [PROFILE_KEY]: JSON.stringify(userProfile) });
  closeProfileModal();
  showMessage('사용자 정보 저장 완료');
}

function buildUserInfoSnippet() {
  const p = userProfile || {};
  const hasValue = p.name || p.org || p.contact || p.email;
  if (!hasValue) return '{{userIn}}';
  const lines = ['[사용자 정보]'];
  if (p.name) lines.push(`- 이름: ${p.name}`);
  if (p.org) lines.push(`- 소속: ${p.org}`);
  if (p.contact) lines.push(`- 연락처: ${p.contact}`);
  if (p.email) lines.push(`- 메일: ${p.email}`);
  return `${lines.join('\n')}\n`;
}

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return {
      get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
      set: (obj) => new Promise((resolve, reject) => {
        chrome.storage.local.set(obj, () => {
          const err = chrome.runtime?.lastError;
          if (err) reject(err);
          else resolve();
        });
      })
    };
  }

  const encode = (value) => {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  };

  const decode = (raw) => {
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return raw;
    }
  };

  return {
    get: async (keys) => {
      const out = {};
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw !== null) out[key] = decode(raw);
        } catch (_) {}
      });
      return out;
    },
    set: async (obj) => {
      Object.entries(obj).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, encode(value));
        } catch (_) {}
      });
    }
  };
}

const storage = getStorage();

function ensureRootFolder() {
  if (!state.folders.some((f) => f.id === 'root')) {
    state.folders.unshift({ id: 'root', name: '루트', parentId: null, createdAt: nowIso() });
  }
}

function createDoc(title, content, folderId) {
  const ts = nowIso();
  return {
    id: uid('doc'),
    title: normalizeDocTitle(title),
    content: String(content || ''),
    folderId: folderId || 'root',
    createdAt: ts,
    updatedAt: ts
  };
}

function getActiveDoc() {
  return state.documents.find((d) => d.id === state.activeDocId) || null;
}

function updateActiveFolderLabel() {
  const folder = state.folders.find((f) => f.id === state.activeFolderId) || state.folders.find((f) => f.id === 'root');
  const name = folder ? folder.name : '루트';
  if (activeFolderLabel) activeFolderLabel.textContent = `현재 폴더: ${name}`;
}

function ensureWorkspaceConsistency() {
  ensureRootFolder();

  const folderIds = new Set(state.folders.map((f) => f.id));
  state.documents.forEach((doc) => {
    if (!folderIds.has(doc.folderId)) doc.folderId = 'root';
  });

  if (!state.documents.length) {
    const doc = createDoc('새 문서', DEFAULT_DOC, 'root');
    state.documents = [doc];
    state.activeDocId = doc.id;
  }

  if (!state.documents.some((d) => d.id === state.activeDocId)) {
    state.activeDocId = state.documents[0].id;
  }

  if (!state.folders.some((f) => f.id === state.activeFolderId)) {
    state.activeFolderId = 'root';
  }

  const validDocIds = new Set(state.documents.map((d) => d.id));
  const nextSelected = new Set();
  state.selectedMergeDocIds.forEach((id) => {
    if (validDocIds.has(id)) nextSelected.add(id);
  });
  state.selectedMergeDocIds = nextSelected;
}

function serializeWorkspace() {
  return {
    folders: state.folders,
    documents: state.documents,
    activeDocId: state.activeDocId,
    activeFolderId: state.activeFolderId
  };
}

async function persistWorkspace() {
  ensureWorkspaceConsistency();
  await storage.set({ [WORKSPACE_KEY]: JSON.stringify(serializeWorkspace()) });
}

function setEditorFromActiveDoc() {
  const doc = getActiveDoc();
  if (!doc) return;
  editor.value = doc.content || '';
  renderMarkdown();
  renderTOC();
}

function setActiveDoc(docId) {
  if (!state.documents.some((d) => d.id === docId)) return;
  state.activeDocId = docId;
  const doc = getActiveDoc();
  state.activeFolderId = doc?.folderId || 'root';
  updateActiveFolderLabel();
  setEditorFromActiveDoc();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function setActiveFolder(folderId) {
  if (!state.folders.some((f) => f.id === folderId)) return;
  state.activeFolderId = folderId;
  updateActiveFolderLabel();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function persistDraft() {
  const doc = getActiveDoc();
  if (!doc) return Promise.resolve();
  doc.content = editor.value;
  doc.updatedAt = nowIso();
  return persistWorkspace();
}

function buildDownloadName(extension) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `vieweditor_${stamp}.${extension}`;
}

function saveCurrentAsMdFile() {
  const content = editor.value || '';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildDownloadName('md');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 300);
}

function focusEditor() {
  editor.focus();
  const len = editor.value.length;
  editor.setSelectionRange(len, len);
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderMarkdown();
    renderTOC();
  }, 120);
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
  persistDraft().catch(() => {});
}

function wrapSelection(before, after) {
  const suffix = after == null ? before : after;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  const selected = value.slice(start, end) || '';
  editor.value = value.slice(0, start) + before + selected + suffix + value.slice(end);
  editor.focus();
  editor.setSelectionRange(start + before.length, start + before.length + selected.length);
  scheduleRender();
  persistDraft().catch(() => {});
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
  persistDraft().catch(() => {});
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
  persistDraft().catch(() => {});
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
  persistDraft().catch(() => {});
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fn';
}

function splitMarkdownAndFootnotes(markdown) {
  const source = String(markdown || '');
  const lines = source.split('\n');
  const bodyLines = [];
  const footnotes = new Map();
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;

    if (!inFence) {
      const def = line.match(/^[\s\u00A0]*\[\^([^\]\s]+)\]:\s*(.*)$/);
      if (def) {
        const id = def[1];
        const chunks = [def[2] || ''];

        while (i + 1 < lines.length) {
          const next = lines[i + 1];
          if (/^(?:\t| {4})/.test(next)) {
            i += 1;
            chunks.push(next.replace(/^(?:\t| {4})/, ''));
            continue;
          }
          if (!next.trim() && i + 2 < lines.length && /^(?:\t| {4})/.test(lines[i + 2])) {
            i += 1;
            chunks.push('');
            continue;
          }
          break;
        }

        footnotes.set(id, chunks.join('\n').trim());
        continue;
      }
    }

    bodyLines.push(line);
  }

  return {
    bodyMarkdown: bodyLines.join('\n').trimEnd(),
    footnotes
  };
}

function injectFootnoteReferences(markdown, footnotes) {
  const source = String(markdown || '');
  if (!source || !footnotes.size) {
    return {
      content: source,
      order: []
    };
  }

  const orderedIds = [];
  const noteNumberById = new Map();
  const refCountById = new Map();

  const content = source.replace(/\[\^([^\]\s]+)\]/g, (full, rawId) => {
    if (!footnotes.has(rawId)) return full;
    if (!noteNumberById.has(rawId)) {
      noteNumberById.set(rawId, orderedIds.length + 1);
      orderedIds.push(rawId);
    }

    const refCount = (refCountById.get(rawId) || 0) + 1;
    refCountById.set(rawId, refCount);
    const num = noteNumberById.get(rawId);
    const id = safeId(rawId);
    const refId = `fnref-${id}-${refCount}`;
    return `<sup class="fn-ref"><a href="#fn-${id}" id="${refId}">[${num}]</a></sup>`;
  });

  return { content, order: orderedIds };
}

function buildFootnotesHtml(orderedIds, footnotes) {
  if (!orderedIds.length) return '';

  const items = orderedIds.map((rawId) => {
    const id = safeId(rawId);
    const rawText = footnotes.get(rawId) || '';
    const parsed = typeof marked !== 'undefined' && marked.parseInline
      ? marked.parseInline(rawText, { breaks: true })
      : escapeHtml(rawText);
    return `<li id="fn-${id}">${parsed} <a href="#fnref-${id}-1" class="fn-backref">↩</a></li>`;
  }).join('');

  return `<section class="footnotes"><hr><ol>${items}</ol></section>`;
}

function isHorizontalRuleLine(line) {
  return /^[\s\u00A0]{0,3}(?:-{3,}|\*{3,}|_{3,})[\s\u00A0]*$/.test(String(line || ''));
}

function normalizeBlankLineBeforeHorizontalRules(text, selectionStart, selectionEnd) {
  const src = String(text || '');
  const lines = src.split('\n');
  if (!lines.length) {
    return {
      text: src,
      changed: false,
      selectionStart: selectionStart || 0,
      selectionEnd: selectionEnd || 0
    };
  }

  const out = [];
  let changed = false;
  let lineStartPos = 0;
  let shiftStart = 0;
  let shiftEnd = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > 0 && isHorizontalRuleLine(line) && String(lines[i - 1] || '').trim() !== '') {
      out.push('');
      changed = true;
      if ((selectionStart || 0) >= lineStartPos) shiftStart += 1;
      if ((selectionEnd || 0) >= lineStartPos) shiftEnd += 1;
    }
    out.push(line);
    lineStartPos += line.length + 1;
  }

  if (!changed) {
    return {
      text: src,
      changed: false,
      selectionStart: selectionStart || 0,
      selectionEnd: selectionEnd || 0
    };
  }

  return {
    text: out.join('\n'),
    changed: true,
    selectionStart: Math.max(0, (selectionStart || 0) + shiftStart),
    selectionEnd: Math.max(0, (selectionEnd || 0) + shiftEnd)
  };
}

async function appendAutoKickstartSpace() {
  const current = String(editor.value || '');
  const next = `${current} `;
  editor.value = next;

  const doc = getActiveDoc();
  if (doc) {
    doc.content = next;
    doc.updatedAt = nowIso();
  }

  const pos = next.length;
  editor.setSelectionRange(pos, pos);
  scheduleRender();
  await persistWorkspace();
}

function renderMarkdown() {
  if (typeof marked !== 'undefined' && marked.parse) {
    const { bodyMarkdown, footnotes } = splitMarkdownAndFootnotes(editor.value || '');
    const { content, order } = injectFootnoteReferences(bodyMarkdown, footnotes);
    const finalOrder = order.length ? order : Array.from(footnotes.keys());
    const html = marked.parse(content, { breaks: true });
    preview.innerHTML = html + buildFootnotesHtml(finalOrder, footnotes);
  } else {
    preview.textContent = editor.value || '';
  }
}

function parseHeadings(markdown) {
  const lines = String(markdown || '').split('\n');
  const headings = [];
  let charOffset = 0;
  lines.forEach((line) => {
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      headings.push({
        level: m[1].length,
        text: m[2].trim(),
        offset: charOffset
      });
    }
    charOffset += line.length + 1;
  });
  return headings;
}

function scrollEditorToOffset(offset) {
  const pos = Math.max(0, Math.min(editor.value.length, Number(offset) || 0));
  editor.focus();
  editor.setSelectionRange(pos, pos);
}

function renderTOC() {
  if (!tocList) return;
  const headings = parseHeadings(editor.value);
  if (!headings.length) {
    tocList.innerHTML = '<div class="toc-empty">헤더가 없습니다. 예: # 제목, ## 소제목</div>';
    return;
  }

  tocList.innerHTML = '';
  headings.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toc-item';
    btn.style.paddingLeft = `${8 + (item.level - 1) * 14}px`;
    btn.textContent = `${'#'.repeat(item.level)} ${item.text}`;
    btn.addEventListener('click', () => scrollEditorToOffset(item.offset));
    tocList.appendChild(btn);
  });
}

function switchSidebarTab(tab) {
  activeSidebarTab = tab === 'toc' ? 'toc' : 'files';
  const isFiles = activeSidebarTab === 'files';
  btnTabFiles.classList.toggle('active', isFiles);
  btnTabToc.classList.toggle('active', !isFiles);
  sidebarFiles.classList.toggle('hidden', !isFiles);
  sidebarToc.classList.toggle('hidden', isFiles);
  if (!isFiles) renderTOC();
}

function getChildFolders(parentId) {
  return state.folders
    .filter((f) => (f.parentId || null) === (parentId || null))
    .sort((a, b) => {
      if (a.id === 'root') return -1;
      if (b.id === 'root') return 1;
      return String(a.name).localeCompare(String(b.name), 'ko');
    });
}

function getDocsInFolder(folderId) {
  return state.documents
    .filter((d) => d.folderId === folderId)
    .sort((a, b) => String(a.title).localeCompare(String(b.title), 'ko'));
}

function createNewDocument(folderId, title, content) {
  const doc = createDoc(title || '새 문서', content == null ? DEFAULT_DOC : content, folderId || state.activeFolderId || 'root');
  state.documents.push(doc);
  state.activeDocId = doc.id;
  state.activeFolderId = doc.folderId;
  renderFileTree();
  setEditorFromActiveDoc();
  updateActiveFolderLabel();
  persistWorkspace().catch(() => {});
}

function createNewFolder(parentId, name) {
  const folder = {
    id: uid('fld'),
    name: normalizeFolderName(name),
    parentId: parentId || 'root',
    createdAt: nowIso()
  };
  state.folders.push(folder);
  state.activeFolderId = folder.id;
  updateActiveFolderLabel();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function getDescendantFolderIds(folderId) {
  const result = [folderId];
  const stack = [folderId];
  while (stack.length) {
    const current = stack.pop();
    const children = state.folders.filter((f) => f.parentId === current).map((f) => f.id);
    children.forEach((id) => {
      result.push(id);
      stack.push(id);
    });
  }
  return result;
}

function deleteFolder(folderId) {
  if (folderId === 'root') return;
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder) return;
  if (!window.confirm(`폴더 '${folder.name}' 및 하위 문서를 삭제할까요?`)) return;

  const removeFolderIds = new Set(getDescendantFolderIds(folderId));
  state.folders = state.folders.filter((f) => !removeFolderIds.has(f.id));
  state.documents = state.documents.filter((d) => !removeFolderIds.has(d.folderId));
  ensureWorkspaceConsistency();
  state.activeFolderId = 'root';
  updateActiveFolderLabel();
  setEditorFromActiveDoc();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function renameFolder(folderId) {
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder || folder.id === 'root') return;
  const next = window.prompt('폴더 이름', folder.name);
  if (next == null) return;
  folder.name = normalizeFolderName(next);
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function renameDoc(docId) {
  const doc = state.documents.find((d) => d.id === docId);
  if (!doc) return;
  const next = window.prompt('문서 이름', doc.title);
  if (next == null) return;
  doc.title = normalizeDocTitle(next);
  doc.updatedAt = nowIso();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function deleteDoc(docId) {
  const doc = state.documents.find((d) => d.id === docId);
  if (!doc) return;
  if (!window.confirm(`문서 '${doc.title}'를 삭제할까요?`)) return;
  state.documents = state.documents.filter((d) => d.id !== docId);
  ensureWorkspaceConsistency();
  updateActiveFolderLabel();
  setEditorFromActiveDoc();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function toggleMergeSelection(docId, checked) {
  if (checked) state.selectedMergeDocIds.add(docId);
  else state.selectedMergeDocIds.delete(docId);
}

function renderFolderNode(folder, depth) {
  const block = document.createElement('div');
  block.className = 'folder-block';
  block.style.marginLeft = `${depth * 10}px`;

  const row = document.createElement('div');
  row.className = `folder-row${folder.id === state.activeFolderId ? ' active' : ''}`;

  const nameBtn = document.createElement('button');
  nameBtn.type = 'button';
  nameBtn.className = 'folder-name-btn';
  nameBtn.textContent = folder.id === 'root' ? '📁 루트' : `📁 ${folder.name}`;
  nameBtn.addEventListener('click', () => setActiveFolder(folder.id));

  const tools = document.createElement('div');
  tools.className = 'folder-tools';

  const addDocBtn = document.createElement('button');
  addDocBtn.type = 'button';
  addDocBtn.className = 'mini-btn';
  addDocBtn.textContent = '+D';
  addDocBtn.title = '이 폴더에 문서 추가';
  addDocBtn.addEventListener('click', () => createNewDocument(folder.id, '새 문서', DEFAULT_DOC));
  tools.appendChild(addDocBtn);

  const addFolderBtn = document.createElement('button');
  addFolderBtn.type = 'button';
  addFolderBtn.className = 'mini-btn';
  addFolderBtn.textContent = '+F';
  addFolderBtn.title = '하위 폴더 추가';
  addFolderBtn.addEventListener('click', () => {
    const name = window.prompt('새 하위 폴더 이름', '새 폴더');
    if (name == null) return;
    createNewFolder(folder.id, name);
  });
  tools.appendChild(addFolderBtn);

  if (folder.id !== 'root') {
    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'mini-btn';
    renameBtn.textContent = 'R';
    renameBtn.title = '폴더 이름 변경';
    renameBtn.addEventListener('click', () => renameFolder(folder.id));
    tools.appendChild(renameBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'mini-btn';
    delBtn.textContent = 'X';
    delBtn.title = '폴더 삭제';
    delBtn.addEventListener('click', () => deleteFolder(folder.id));
    tools.appendChild(delBtn);
  }

  row.appendChild(nameBtn);
  row.appendChild(tools);
  block.appendChild(row);

  const docs = getDocsInFolder(folder.id);
  if (docs.length) {
    const docList = document.createElement('div');
    docList.className = 'doc-list';

    docs.forEach((doc) => {
      const docRow = document.createElement('div');
      docRow.className = `doc-row${doc.id === state.activeDocId ? ' active' : ''}`;

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = state.selectedMergeDocIds.has(doc.id);
      chk.title = '병합 선택';
      chk.addEventListener('change', (e) => toggleMergeSelection(doc.id, e.target.checked));

      const titleBtn = document.createElement('button');
      titleBtn.type = 'button';
      titleBtn.className = 'doc-title-btn';
      titleBtn.textContent = doc.title;
      titleBtn.title = doc.title;
      titleBtn.addEventListener('click', () => setActiveDoc(doc.id));

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'mini-btn';
      renameBtn.textContent = 'R';
      renameBtn.title = '문서 이름 변경';
      renameBtn.addEventListener('click', () => renameDoc(doc.id));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'mini-btn';
      delBtn.textContent = 'X';
      delBtn.title = '문서 삭제';
      delBtn.addEventListener('click', () => deleteDoc(doc.id));

      docRow.appendChild(chk);
      docRow.appendChild(titleBtn);
      docRow.appendChild(renameBtn);
      docRow.appendChild(delBtn);
      docList.appendChild(docRow);
    });

    block.appendChild(docList);
  }

  const children = getChildFolders(folder.id).filter((f) => f.id !== 'root');
  children.forEach((child) => {
    block.appendChild(renderFolderNode(child, depth + 1));
  });

  return block;
}

function renderFileTree() {
  if (!fileTree) return;
  fileTree.innerHTML = '';
  ensureWorkspaceConsistency();
  const root = state.folders.find((f) => f.id === 'root');
  if (!root) return;
  fileTree.appendChild(renderFolderNode(root, 0));
  updateActiveFolderLabel();
}

function mergeSelectedDocuments() {
  const selected = state.documents.filter((d) => state.selectedMergeDocIds.has(d.id));
  if (!selected.length) {
    showMessage('병합할 문서를 1개 이상 선택하세요.');
    return;
  }

  const defaultName = `병합문서_${new Date().toISOString().slice(0, 10)}`;
  const name = window.prompt('병합 문서 이름', defaultName);
  if (name == null) return;

  const mergedContent = selected
    .map((doc) => `## ${doc.title}\n\n${doc.content || ''}`)
    .join('\n\n---\n\n');

  createNewDocument(state.activeFolderId || 'root', normalizeDocTitle(name), mergedContent);
  state.selectedMergeDocIds.clear();
  renderFileTree();
  persistWorkspace().catch(() => {});
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

function buildMpvPayload() {
  return {
    format: MPV_FORMAT,
    exportedAt: nowIso(),
    folders: state.folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId || null, createdAt: f.createdAt || null })),
    documents: state.documents.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      folderId: d.folderId || 'root',
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null
    }))
  };
}

function exportMpvBackup() {
  const payload = buildMpvPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `vieweditor_backup_${new Date().toISOString().slice(0, 10)}.mvp`);
}

function parseMpvText(text) {
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error('MVP 파일이 JSON 형식이 아닙니다.');
  }

  if (!data || !Array.isArray(data.folders) || !Array.isArray(data.documents)) {
    throw new Error('MVP 형식이 올바르지 않습니다.');
  }

  return data;
}

function mergeImportedWorkspace(imported) {
  const folderIdMap = new Map();
  folderIdMap.set('root', 'root');

  const importedFolders = imported.folders.filter((f) => f && f.id && f.id !== 'root');
  importedFolders.forEach((folder) => {
    const newId = uid('fld');
    folderIdMap.set(folder.id, newId);
  });

  importedFolders.forEach((folder) => {
    const mappedParent = folderIdMap.get(folder.parentId) || 'root';
    state.folders.push({
      id: folderIdMap.get(folder.id),
      name: normalizeFolderName(folder.name),
      parentId: mappedParent,
      createdAt: folder.createdAt || nowIso()
    });
  });

  const importedDocs = imported.documents.filter((d) => d && typeof d.content === 'string');
  importedDocs.forEach((doc) => {
    const newDoc = {
      id: uid('doc'),
      title: normalizeDocTitle(doc.title),
      content: String(doc.content || ''),
      folderId: folderIdMap.get(doc.folderId) || 'root',
      createdAt: doc.createdAt || nowIso(),
      updatedAt: doc.updatedAt || nowIso()
    };
    state.documents.push(newDoc);
    state.activeDocId = newDoc.id;
    state.activeFolderId = newDoc.folderId;
  });

  if (!importedDocs.length) {
    showMessage('MVP에서 가져올 문서가 없습니다.');
    return;
  }

  ensureWorkspaceConsistency();
  renderFileTree();
  setEditorFromActiveDoc();
  updateActiveFolderLabel();
  persistWorkspace().catch(() => {});
  showMessage(`MVP 불러오기 완료: 폴더 ${importedFolders.length}개, 문서 ${importedDocs.length}개 병합됨`);
}

async function importMpvFile(file) {
  if (!file) return;
  const text = await file.text();
  const imported = parseMpvText(text);
  mergeImportedWorkspace(imported);
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
    case 'userinfo': insertAtCursor(buildUserInfoSnippet()); break;
    case 'userSettings': openProfileModal(); break;
    default: break;
  }
}

function togglePreview() {
  previewVisible = !previewVisible;
  document.body.classList.toggle('preview-hidden', !previewVisible);
  btnTogglePreview.textContent = previewVisible ? '미리보기' : '편집만';
}

function toggleSidebar() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  if (btnToggleSidebar) {
    btnToggleSidebar.textContent = collapsed ? '☰' : '✕';
    btnToggleSidebar.title = collapsed ? '왼쪽 사이드바 보이기' : '왼쪽 사이드바 숨기기';
  }
}

function toggleToolbar() {
  const collapsed = document.body.classList.toggle('toolbar-collapsed');
  if (btnToggleToolbar) {
    btnToggleToolbar.textContent = collapsed ? '⌘' : '✕';
    btnToggleToolbar.title = collapsed ? '편집 메뉴 보이기' : '편집 메뉴 숨기기';
  }
  if (!collapsed && editorToolbar) {
    setTimeout(() => {
      editorToolbar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 60);
  }
}

function getLegacyDraftValue(raw) {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    if (typeof raw.value === 'string') return raw.value;
  }
  return '';
}

function applyIncomingToWorkspace(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return;

  const activeDoc = getActiveDoc();
  if (activeDoc && !String(activeDoc.content || '').trim()) {
    activeDoc.content = normalized;
    activeDoc.updatedAt = nowIso();
  } else {
    createNewDocument(state.activeFolderId || 'root', `붙여넣기_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`, normalized);
  }
}

const incomingPasteBridge = window.ViewEditorPaste?.createBridge?.({
  editor,
  renderMarkdown,
  focusEditor,
  persistDraft,
  storage
});

const PASTE_KEY = incomingPasteBridge?.PASTE_KEY || 'scholarToMDPaste';

async function loadWorkspace() {
  let storedWorkspace = null;
  let legacyDraft = '';
  let incomingText = '';

  try {
    const data = await storage.get([WORKSPACE_KEY, LEGACY_DRAFT_KEY, PASTE_KEY]);
    storedWorkspace = data[WORKSPACE_KEY];
    legacyDraft = getLegacyDraftValue(data[LEGACY_DRAFT_KEY]);
    incomingText = typeof data[PASTE_KEY] === 'string' ? data[PASTE_KEY].trim() : '';
  } catch (_) {}

  if (storedWorkspace) {
    try {
      const parsed = typeof storedWorkspace === 'string' ? JSON.parse(storedWorkspace) : storedWorkspace;
      state.folders = Array.isArray(parsed.folders) ? parsed.folders : [];
      state.documents = Array.isArray(parsed.documents) ? parsed.documents : [];
      state.activeDocId = parsed.activeDocId || null;
      state.activeFolderId = parsed.activeFolderId || 'root';
    } catch (_) {
      state.folders = [];
      state.documents = [];
      state.activeDocId = null;
      state.activeFolderId = 'root';
    }
  }

  if (!state.documents.length) {
    state.folders = [{ id: 'root', name: '루트', parentId: null, createdAt: nowIso() }];
    state.documents = [createDoc('새 문서', legacyDraft || DEFAULT_DOC, 'root')];
    state.activeDocId = state.documents[0].id;
    state.activeFolderId = 'root';
  }

  ensureWorkspaceConsistency();

  if (incomingText) {
    applyIncomingToWorkspace(incomingText);
    await storage.set({ [PASTE_KEY]: '' });
  }

  renderFileTree();
  setEditorFromActiveDoc();
  updateActiveFolderLabel();
  await persistWorkspace();
}

editor.addEventListener('input', () => {
  const normalized = normalizeBlankLineBeforeHorizontalRules(
    editor.value,
    editor.selectionStart,
    editor.selectionEnd
  );
  if (normalized.changed) {
    editor.value = normalized.text;
    editor.setSelectionRange(normalized.selectionStart, normalized.selectionEnd);
  }

  const doc = getActiveDoc();
  if (doc) {
    doc.content = normalized.text;
    doc.updatedAt = nowIso();
  }
  scheduleRender();
  persistWorkspace().catch(() => {});
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

btnToggleSidebar?.addEventListener('click', toggleSidebar);
btnToggleToolbar?.addEventListener('click', toggleToolbar);
btnTogglePreview?.addEventListener('click', togglePreview);
btnRenderBottom?.addEventListener('click', () => {
  previewVisible = true;
  document.body.classList.remove('preview-hidden');
  btnTogglePreview.textContent = '미리보기';
  renderMarkdown();
});

btnNewFile?.addEventListener('click', () => {
  createNewDocument(state.activeFolderId || 'root', '새 문서', DEFAULT_DOC);
  focusEditor();
});

btnNewFolder?.addEventListener('click', () => {
  const name = window.prompt('새 폴더 이름', '새 폴더');
  if (name == null) return;
  createNewFolder(state.activeFolderId || 'root', name);
});

btnMergeSelected?.addEventListener('click', mergeSelectedDocuments);
btnBackupMpv?.addEventListener('click', exportMpvBackup);

btnImportMpv?.addEventListener('click', () => fileImportMpv?.click());
fileImportMpv?.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    await importMpvFile(file);
  } catch (err) {
    showMessage(`MVP 불러오기 실패: ${err && err.message ? err.message : err}`);
  } finally {
    e.target.value = '';
  }
});

btnSave?.addEventListener('click', () => {
  persistWorkspace()
    .then(() => showMessage('내부저장 완료'))
    .catch(() => showMessage('저장 실패'));
});

btnSaveMd?.addEventListener('click', saveCurrentAsMdFile);
btnTextSmaller?.addEventListener('click', () => {
  changeEditorFontSize(-1).catch(() => {});
});
btnTextLarger?.addEventListener('click', () => {
  changeEditorFontSize(1).catch(() => {});
});
btnProfileCancel?.addEventListener('click', closeProfileModal);
btnProfileSave?.addEventListener('click', () => {
  saveProfileFromModal().catch(() => showMessage('사용자 정보 저장 실패'));
});
profileModal?.addEventListener('click', (e) => {
  if (e.target === profileModal) closeProfileModal();
});

btnTabFiles?.addEventListener('click', () => switchSidebarTab('files'));
btnTabToc?.addEventListener('click', () => switchSidebarTab('toc'));
preview?.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const href = link.getAttribute('href') || '';
  const targetId = decodeURIComponent(href.slice(1));
  if (!targetId) return;

  const escapedId = (window.CSS && typeof window.CSS.escape === 'function')
    ? window.CSS.escape(targetId)
    : targetId.replace(/["\\]/g, '\\$&');
  const target = preview.querySelector(`#${escapedId}`);
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

(async function init() {
  try {
    const uiData = await storage.get([FONT_SIZE_KEY, PROFILE_KEY]);
    applyEditorFontSize(uiData[FONT_SIZE_KEY] ?? 14);
    const rawProfile = uiData[PROFILE_KEY];
    if (typeof rawProfile === 'string' && rawProfile.trim()) {
      userProfile = normalizeProfile(JSON.parse(rawProfile));
    } else {
      userProfile = normalizeProfile(rawProfile);
    }
  } catch (_) {
    applyEditorFontSize(14);
  }

  await loadWorkspace();
  switchSidebarTab('files');
  document.body.classList.add('sidebar-collapsed');
  document.body.classList.add('toolbar-collapsed');
  if (btnToggleSidebar) {
    btnToggleSidebar.textContent = '☰';
    btnToggleSidebar.title = '왼쪽 사이드바 보이기';
  }
  if (btnToggleToolbar) {
    btnToggleToolbar.textContent = '⌘';
    btnToggleToolbar.title = '편집 메뉴 보이기';
  }

  incomingPasteBridge?.initIncomingPasteSync?.();

  try {
    await appendAutoKickstartSpace();
  } catch (_) {}

  focusEditor();
  setTimeout(focusEditor, 120);

  setTimeout(() => {
    incomingPasteBridge?.pullIncomingContent?.({
      preferClipboard: true,
      allowOverwrite: !String(editor.value || '').trim()
    }).catch(() => {});
  }, 250);
})();
