/**
 * Scholar Assistant - NotebookLM Extension
 * 왼쪽 하단 사이드바: 드래그 이동 가능, 다크/라이트 모드 지원
 */
(function () {
  'use strict';

  const ROOT_ID = 'scholar-assistant-root';
  const BTN_ID = 'scholar-assistant-float-btn';
  const BTN_SMALL_ID = 'scholar-assistant-float-btn-small';
  const MD_EDITOR_HEADER_BTN_ID = 'scholar-mdeditor-header-btn';
  const STORAGE_HIDE_MD_EDITOR_HEADER = 'hideMDEditorHeader';
  const PROMPTS_HEADER_BTN_ID = 'scholar-prompts-header-btn';
  const SIDEBAR_ID = 'scholar-assistant-sidebar';
  const STORAGE_FEATURE_NOTEBOOKLM = 'scholarFeatureNotebookLM';
  let scholarNotebookLMTeardownDone = false;

  function teardownScholarNotebookLMInjections() {
    if (scholarNotebookLMTeardownDone) return;
    scholarNotebookLMTeardownDone = true;
    toggleSidebarFn = null;
    closeSidebarFn = null;
    try { document.getElementById(ROOT_ID)?.remove(); } catch (_) {}
    try { document.getElementById(PROMPTS_HEADER_BTN_ID)?.remove(); } catch (_) {}
    try { document.getElementById(MD_EDITOR_HEADER_BTN_ID)?.remove(); } catch (_) {}
    try {
      document.querySelectorAll('[data-scholar-studio-prompts="1"]').forEach((el) => el.remove());
    } catch (_) {}
    try {
      document.querySelectorAll('[data-scholar-studio-btns-injected]').forEach((el) => el.remove());
    } catch (_) {}
    try {
      document.querySelectorAll('[data-scholar-msg-btns-injected="1"]').forEach((el) => el.remove());
    } catch (_) {}
  }

  function registerNotebookLMFeatureStorageListener() {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[STORAGE_FEATURE_NOTEBOOKLM]) return;
        const on = changes[STORAGE_FEATURE_NOTEBOOKLM].newValue !== false;
        if (!on) teardownScholarNotebookLMInjections();
        else location.reload();
      });
    } catch (_) {}
  }

  function readNotebookLMFeatureEnabled(callback) {
    try {
      chrome.storage.local.get(STORAGE_FEATURE_NOTEBOOKLM, (r) => {
        if (chrome.runtime.lastError) {
          callback(true);
          return;
        }
        callback(r[STORAGE_FEATURE_NOTEBOOKLM] !== false);
      });
    } catch (_) {
      callback(true);
    }
  }

  const EXTENSION_BASE_URL = (() => {
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.id && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('');
    }
  } catch (_) {}
  const currentSrc = document.currentScript?.src || '';
  const fromSidebar = document.querySelector('#' + SIDEBAR_ID + ' iframe')?.src || '';
  const baseSource = currentSrc || fromSidebar;
  if (baseSource && /^chrome-extension:\/\//.test(baseSource)) {
    return baseSource.replace(/[^/]*$/, '');
  }
  return '';
})();

  function getManifestVersion() {
    try {
      const v = chrome.runtime.getManifest()?.version;
      return typeof v === 'string' && v.trim() ? v.trim() : '';
    } catch (_) {
      return '';
    }
  }

  const SIDEBAR_MIN_WIDTH = 380;
  const SIDEBAR_MIN_HEIGHT = 480;
  const SIDEBAR_MAX_WIDTH = 1200;
  const SIDEBAR_MAX_HEIGHT = 950;
  /** 축소 모드: iframe·프롬프트를 더 안쪽(좁게) */
  const SIDEBAR_COMPACT_TARGET_WIDTH = 292;
  const SIDEBAR_MIN_WIDTH_COMPACT = 248;
  const STORAGE_POPUP_SIDEBAR_COMPACT = 'popupSidebarCompact';

  let toggleSidebarFn = null;
  let closeSidebarFn = null;
  let pos = { left: 0, top: 0 };
  let size = { width: 560, height: 720 };
  let isDragging = false;
  let isResizing = false;
  let dragStart = { x: 0, y: 0, left: 0, top: 0 };
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };

  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  function isExtensionContextValid() {
    try {
      return typeof chrome !== 'undefined' && !!chrome?.runtime?.id;
    } catch (_) { return false; }
  }

  let scholarConfirmModulePromise = null;

  function getScholarConfirmModule() {
    if (scholarConfirmModulePromise) return scholarConfirmModulePromise;
    try {
      const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
        ? chrome.runtime.getURL('confirm/confirm.js')
        : '';
      scholarConfirmModulePromise = url ? import(url).catch(() => null) : Promise.resolve(null);
    } catch (_) {
      scholarConfirmModulePromise = Promise.resolve(null);
    }
    return scholarConfirmModulePromise;
  }

  async function confirmToMDSave(url) {
    const mod = await getScholarConfirmModule();
    if (mod?.ScholarConfirm?.confirmExternalToMD) {
      return mod.ScholarConfirm.confirmExternalToMD(url, window.confirm.bind(window));
    }
    if (window.ScholarConfirm?.confirmExternalToMD) {
      return window.ScholarConfirm.confirmExternalToMD(url, window.confirm.bind(window));
    }
    if (typeof url === 'string' && /^https:\/\/mdproviewer\.vercel\.app\/?/i.test(url)) {
      return window.confirm('Would you like to save this clipping?(?????? ?????????)');
    }
    return true;
  }

  async function confirmScholarSlideSave(url) {
    const mod = await getScholarConfirmModule();
    if (mod?.ScholarConfirm?.confirmScholarSlide) {
      return mod.ScholarConfirm.confirmScholarSlide(url, window.confirm.bind(window));
    }
    if (window.ScholarConfirm?.confirmScholarSlide) {
      return window.ScholarConfirm.confirmScholarSlide(url, window.confirm.bind(window));
    }
    if (typeof url === 'string' && /^https:\/\/scholarslide\.vercel\.app\/?/i.test(url)) {
      return window.confirm('Would you like to save this clipping before sending to Scholar Slide?(?????? ??? ? Scholar Slide? ????????)');
    }
    return true;
  }

  async function getConfiguredToMDUrl() {
    let url = 'https://mdproviewer.vercel.app/';
    const internalUrl = EXTENSION_BASE_URL ? EXTENSION_BASE_URL + 'vieweditor/index.html' : url;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get('tomdOpenType');
        if ((data && data.tomdOpenType) !== 'external') {
          url = internalUrl;
        }
      } else if (internalUrl !== url) {
        url = internalUrl;
      }
    } catch (_) {
      if (internalUrl !== url) url = internalUrl;
    }
    return url;
  }

  function openConfiguredToMD(url) {
    const fallbackOpen = () => window.open(url, '_blank', 'noopener,noreferrer');
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && isExtensionContextValid()) {
        const maybePromise = chrome.runtime.sendMessage({ action: 'openToMD', url });
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => fallbackOpen());
          return;
        }
      }
    } catch (_) {}
    fallbackOpen();
  }

  function init() {
    if (getRoot()) return;

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483645;';
    document.body.appendChild(root);

    const baseBtnStyle = `
      pointer-events:auto;
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s, transform 0.1s;
      vertical-align: middle;
    `;
    const extVersion = getManifestVersion() || '—';
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.innerHTML = `학술도구 어시스턴트 by박중희 ${extVersion}`;
    btn.title = '학술도구 어시스턴트 사이드바 열기/닫기';
    btn.style.cssText = baseBtnStyle + 'margin-left: 12px; padding: 4px 12px;';
    btn.onmouseover = () => {
      btn.style.background = '#334155';
      btn.style.transform = 'scale(1.02)';
    };
    btn.onmouseout = () => {
      btn.style.background = '#1e293b';
      btn.style.transform = 'scale(1)';
    };

    const smallBtn = document.createElement('button');
    smallBtn.id = BTN_SMALL_ID;
    smallBtn.innerHTML = `학술도구 어시스턴트 ${extVersion}`;
    smallBtn.title = '학술도구 어시스턴트 사이드바 열기/닫기';
    smallBtn.style.cssText = baseBtnStyle + 'padding: 2px 8px; font-size: 10px; position: fixed; bottom: 8px; left: 8px; margin: 0; z-index: 2147483646;';
    smallBtn.onmouseover = () => {
      smallBtn.style.background = '#334155';
      smallBtn.style.transform = 'scale(1.05)';
    };
    smallBtn.onmouseout = () => {
      smallBtn.style.background = '#1e293b';
      smallBtn.style.transform = 'scale(1)';
    };

    const sidebar = document.createElement('div');
    sidebar.id = SIDEBAR_ID;
    function updateSidebarSize() {
      sidebar.style.width = size.width + 'px';
      sidebar.style.height = size.height + 'px';
    }
    function getInitialTop() {
      return Math.max(0, window.innerHeight - size.height - 200);
    }
    if (pos.top === 0) pos.top = getInitialTop();
    sidebar.style.cssText = `
      pointer-events: auto;
      position: fixed;
      left: ${pos.left}px;
      top: ${pos.top}px;
      width: ${size.width}px;
      height: ${size.height}px;
      background: #0f172a;
      box-shadow: 4px 0 24px rgba(0,0,0,0.4);
      z-index: 2147483646;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 12px 12px 0 0;
      border: 1px solid #334155;
    `;

    const dragHeader = document.createElement('div');
    dragHeader.title = '드래그하여 이동';
    dragHeader.style.cssText = `
      flex-shrink: 0;
      height: 44px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      cursor: move;
      user-select: none;
      touch-action: none;
      gap: 8px;
    `;

    const compactBtn = document.createElement('button');
    compactBtn.type = 'button';
    compactBtn.title = '축소 (번호 단축·좁은 폭)';
    compactBtn.setAttribute('aria-pressed', 'false');
    compactBtn.style.cssText = `
      padding: 4px 10px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.02em;
      cursor: pointer;
      background: #14b8a6;
      color: #042f2e;
      font-family: inherit;
      flex-shrink: 0;
      line-height: 1;
      pointer-events: auto;
    `;
    compactBtn.innerHTML = '<span class="scholar-sidebar-compact-icon"><<<</span>';

    const dragHeaderSpacer = document.createElement('div');
    dragHeaderSpacer.style.cssText = 'flex:1;min-width:8px;pointer-events:none;';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '−';
    closeBtn.title = '축소 (Scholar Assistant 버튼으로 다시 열기)';
    closeBtn.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      background: #334155;
      color: #94a3b8;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
    `;
    closeBtn.onmouseover = () => { closeBtn.style.background = '#475569'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = '#334155'; };

    dragHeader.appendChild(compactBtn);
    dragHeader.appendChild(dragHeaderSpacer);
    dragHeader.appendChild(closeBtn);

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.style.cssText = 'flex:1;border:none;width:100%;min-height:0;display:block;vertical-align:top;';

    const resizeHandle = document.createElement('div');
    resizeHandle.title = '드래그하여 크기 조절';
    resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      z-index: 10;
      background: linear-gradient(135deg, transparent 50%, #475569 50%);
      border-radius: 0 0 4px 0;
      touch-action: none;
    `;
    resizeHandle.onmouseover = () => { resizeHandle.style.opacity = '1'; };
    resizeHandle.onmouseout = () => { resizeHandle.style.opacity = '0.6'; };
    resizeHandle.style.opacity = '0.6';

    let sidebarUiCompact = false;
    let widthBeforeSidebarCompact = size.width;

    function getSidebarMinW() {
      return sidebarUiCompact ? SIDEBAR_MIN_WIDTH_COMPACT : SIDEBAR_MIN_WIDTH;
    }

    function updateCompactBtnUi(compact) {
      const icon = compactBtn.querySelector('.scholar-sidebar-compact-icon');
      if (icon) icon.textContent = compact ? '>>>' : '<<<';
      compactBtn.title = compact ? '펼치기 (전체 프롬프트 패널)' : '축소 (번호 단축·좁은 폭)';
      compactBtn.setAttribute('aria-pressed', compact ? 'true' : 'false');
    }

    function applyChromeSidebarCompactWidth(compact) {
      const next = !!compact;
      if (next) {
        if (!sidebarUiCompact) {
          widthBeforeSidebarCompact = size.width;
          size.width = SIDEBAR_COMPACT_TARGET_WIDTH;
        }
      } else if (sidebarUiCompact) {
        size.width = Math.max(SIDEBAR_MIN_WIDTH, widthBeforeSidebarCompact || 560);
      }
      sidebarUiCompact = next;
      updateSidebarSize();
    }

    function postCompactToIframe(c) {
      try {
        iframe.contentWindow?.postMessage({ type: 'scholarApplySidebarCompact', compact: c }, '*');
      } catch (_) {}
    }

    function syncCompactShellFromStorage() {
      try {
        chrome.storage.local.get(STORAGE_POPUP_SIDEBAR_COMPACT, (r) => {
          if (chrome.runtime.lastError) return;
          const c = r[STORAGE_POPUP_SIDEBAR_COMPACT] === true;
          applyChromeSidebarCompactWidth(c);
          updateCompactBtnUi(c);
          postCompactToIframe(c);
        });
      } catch (_) {}
    }

    compactBtn.onclick = (e) => {
      e.stopPropagation();
      const next = !sidebarUiCompact;
      applyChromeSidebarCompactWidth(next);
      updateCompactBtnUi(next);
      postCompactToIframe(next);
      try {
        chrome.storage.local.set({ [STORAGE_POPUP_SIDEBAR_COMPACT]: next });
      } catch (_) {}
    };

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[STORAGE_POPUP_SIDEBAR_COMPACT]) return;
        if (!document.getElementById(SIDEBAR_ID)) return;
        const c = changes[STORAGE_POPUP_SIDEBAR_COMPACT].newValue === true;
        applyChromeSidebarCompactWidth(c);
        updateCompactBtnUi(c);
        postCompactToIframe(c);
      });
    } catch (_) {}

    iframe.addEventListener('load', () => {
      syncCompactShellFromStorage();
    });
    syncCompactShellFromStorage();

    sidebar.style.position = 'relative';
    sidebar.appendChild(dragHeader);
    sidebar.appendChild(iframe);
    sidebar.appendChild(resizeHandle);

    function updateSidebarPosition() {
      sidebar.style.left = pos.left + 'px';
      sidebar.style.top = pos.top + 'px';
    }

    function onDragStart(e) {
      if (resizeHandle.contains(e.target)) return;
      if (closeBtn.contains(e.target)) return;
      if (compactBtn.contains(e.target)) return;
      if (!dragHeader.contains(e.target)) return;
      e.preventDefault();
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top };
      dragHeader.setPointerCapture(e.pointerId);
    }

    function onDragEnd(e) {
      try { if (e.pointerId != null) dragHeader.releasePointerCapture(e.pointerId); } catch (_) {}
      isDragging = false;
    }

    function onResizeStart(e) {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      resizeStart = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
      resizeHandle.setPointerCapture(e.pointerId);
    }

    function onResizeEnd(e) {
      try { if (e.pointerId != null) resizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
      isResizing = false;
    }

    function onPointerMove(e) {
      if (isResizing) {
        const dw = e.clientX - resizeStart.x;
        const dh = e.clientY - resizeStart.y;
        const minW = getSidebarMinW();
        size.width = Math.max(minW, Math.min(SIDEBAR_MAX_WIDTH, resizeStart.w + dw));
        size.height = Math.max(SIDEBAR_MIN_HEIGHT, Math.min(SIDEBAR_MAX_HEIGHT, resizeStart.h + dh));
        updateSidebarSize();
        return;
      }
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      pos.left = Math.max(0, Math.min(window.innerWidth - size.width, dragStart.left + dx));
      pos.top = Math.max(0, Math.min(window.innerHeight - size.height - 20, dragStart.top + dy));
      updateSidebarPosition();
    }

    dragHeader.addEventListener('pointerdown', onDragStart);
    dragHeader.addEventListener('pointermove', onPointerMove);
    dragHeader.addEventListener('pointerup', onDragEnd);
    dragHeader.addEventListener('pointercancel', onDragEnd);
    resizeHandle.addEventListener('pointerdown', onResizeStart);
    resizeHandle.addEventListener('pointermove', onPointerMove);
    resizeHandle.addEventListener('pointerup', onResizeEnd);
    resizeHandle.addEventListener('pointercancel', onResizeEnd);

    let sidebarOpen = false;
    function toggleSidebar() {
      sidebarOpen = !sidebarOpen;
      if (sidebarOpen) {
        sidebar.style.transform = 'translateX(0)';
      } else {
        const slideOut = pos.left + size.width;
        sidebar.style.transform = `translateX(-${slideOut}px)`;
      }
    }
    function closeSidebar() {
      if (sidebarOpen) {
        sidebarOpen = false;
        const slideOut = pos.left + size.width;
        sidebar.style.transform = `translateX(-${slideOut}px)`;
      }
    }
    toggleSidebarFn = toggleSidebar;
    closeSidebarFn = closeSidebar;

    closeBtn.onclick = (e) => { e.stopPropagation(); toggleSidebar(); };
    btn.onclick = toggleSidebar;
    smallBtn.onclick = toggleSidebar;

    root.appendChild(btn);
    root.appendChild(smallBtn);
    root.appendChild(sidebar);
    tryPlaceMainButtonNextToCreateNotebook(btn);
    tryPlaceMainButtonLoop(btn);
  }

  function tryPlaceMainButtonLoop(btn) {
    if (findCreateNotebookButton()) return;
    const obs = new MutationObserver(() => {
      if (tryPlaceMainButtonNextToCreateNotebook(btn)) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      tryPlaceMainButtonNextToCreateNotebook(btn);
    }, 8000);
  }

  function findCreateNotebookButton() {
    const keywords = ['노트북 만들기', '새로 만들기', '새 노트 만들기', 'Create Notebook', 'Create notebook'];
    const candidates = queryAllIncludingShadow(document.body, 'button, [role="button"], a');
    for (const el of candidates) {
      const text = (el.textContent || '').trim();
      if (keywords.some(k => text.includes(k))) return el;
    }
    return null;
  }

  /**
   * MDEditor를 prompts 버튼 오른쪽(원래 위치)에 둠.
   * mdBtnOrNull: DOM 연결 전 새 버튼이면 참조를 넘겨야 함.
   */
  function repositionMDEditorHeaderButton(mdBtnOrNull) {
    const mdBtn = mdBtnOrNull || document.getElementById(MD_EDITOR_HEADER_BTN_ID);
    if (!mdBtn) return;
    const promptsBtn = document.getElementById(PROMPTS_HEADER_BTN_ID);
    if (promptsBtn?.parentElement) {
      promptsBtn.insertAdjacentElement('afterend', mdBtn);
      return;
    }
    const settingsEl = document.querySelector('title-bar-settings');
    const container = document.querySelector('.notebook-header-buttons-container');
    if (settingsEl?.parentElement) {
      settingsEl.insertAdjacentElement('afterend', mdBtn);
      return;
    }
    if (container) container.appendChild(mdBtn);
  }

  function setMDEditorHeaderButtonHidden(mdBtn, hidden) {
    if (!mdBtn) return;
    mdBtn.style.display = hidden ? 'none' : '';
    mdBtn.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function syncMDEditorHeaderButtonVisibility(mdBtn) {
    const el = mdBtn || document.getElementById(MD_EDITOR_HEADER_BTN_ID);
    if (!el) return;
    try {
      chrome.storage.local.get(STORAGE_HIDE_MD_EDITOR_HEADER, (r) => {
        if (chrome.runtime.lastError) return;
        const hidden = r[STORAGE_HIDE_MD_EDITOR_HEADER] !== false;
        setMDEditorHeaderButtonHidden(el, hidden);
      });
    } catch (_) {}
  }

  function registerHideMDEditorHeaderStorageListener() {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[STORAGE_HIDE_MD_EDITOR_HEADER]) return;
        const hidden = changes[STORAGE_HIDE_MD_EDITOR_HEADER].newValue !== false;
        const btn = document.getElementById(MD_EDITOR_HEADER_BTN_ID);
        setMDEditorHeaderButtonHidden(btn, hidden);
      });
    } catch (_) {}
  }

  function tryPlaceMainButtonNextToCreateNotebook(btn) {
    if (!btn || !document.getElementById(BTN_ID)) return;
    const createBtn = findCreateNotebookButton();
    if (createBtn) {
      btn.style.marginLeft = '8px';
      btn.style.marginRight = '0';
      createBtn.insertAdjacentElement('beforebegin', btn);
      return true;
    }
    btn.style.position = 'fixed';
    btn.style.top = '16px';
    btn.style.right = '16px';
    btn.style.left = 'auto';
    btn.style.bottom = 'auto';
    btn.style.margin = '0';
    btn.style.zIndex = '2147483646';
    return false;
  }

  const SCHOLAR_STORAGE_KEYS = ['scrappedContent', 'accumulatedScraps', 'promptInput'];

  function isInNotebook() {
    return !!(document.querySelector('section.chat-panel') || document.querySelector('chat-panel') ||
      document.querySelector('[class*="chat-panel"]') || document.querySelector('query-box'));
  }

  async function clearScholarHistoryAndClose() {
    if (closeSidebarFn) closeSidebarFn();
    try {
      if (isExtensionContextValid() && chrome.storage?.local) {
        await chrome.storage.local.remove(SCHOLAR_STORAGE_KEYS);
      }
    } catch (_) {}
    try {
      if (isExtensionContextValid()) {
        chrome.runtime.sendMessage({ action: 'notebookExited' }).catch(() => {});
      }
    } catch (_) {}
    const iframe = document.querySelector(`#${SIDEBAR_ID} iframe`);
    if (iframe?.contentWindow) {
      try { iframe.contentWindow.postMessage({ type: 'clearOnNotebookExit' }, '*'); } catch (_) {}
    }
  }

  /** NotebookLM 탭 새로고침·닫기·다른 사이트 이동 시 확장이 연 팝업(prompts 등) 닫기 */
  function initCloseSatelliteWindowsOnUnload() {
    window.addEventListener('pagehide', (e) => {
      if (e.persisted) return;
      try {
        if (isExtensionContextValid()) {
          chrome.runtime.sendMessage({ action: 'closeNotebookLmSatelliteWindows' }).catch(() => {});
        }
      } catch (_) {}
    });
  }

  function initNotebookExitWatcher() {
    let wasInNotebook = isInNotebook();
    let exitCheckCount = 0;
    const EXIT_CONFIRM_COUNT = 2;
    const check = () => {
      const nowInNotebook = isInNotebook();
      if (wasInNotebook && !nowInNotebook) {
        exitCheckCount++;
        if (exitCheckCount >= EXIT_CONFIRM_COUNT) {
          wasInNotebook = false;
          exitCheckCount = 0;
          clearScholarHistoryAndClose();
        }
      } else {
        exitCheckCount = 0;
        if (nowInNotebook) wasInNotebook = true;
      }
    };
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(check, 3000);
    if (!wasInNotebook && isExtensionContextValid()) {
      try { chrome.storage.local.remove(SCHOLAR_STORAGE_KEYS).catch(() => {}); } catch (_) {}
    }
  }

  function findNotebookLMInput() {
    const panel = document.querySelector('section.chat-panel') || document.querySelector('chat-panel');
    if (!panel) return null;
    const box = panel.querySelector('query-box');
    return box ? box.querySelector('textarea') : null;
  }


  function isVisibleElement(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function findStudioPromptContainer() {
    const candidates = queryAllIncludingShadow(document.body, 'section.studio-panel, studio-panel, [class*="studio-panel"], [role="dialog"], mat-dialog-container, .cdk-overlay-pane, .cdk-dialog-container');
    const filtered = candidates.filter((el) => isVisibleElement(el) && !isInChatArea(el));
    filtered.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (br.width * br.height) - (ar.width * ar.height);
    });
    return filtered.find((el) => el.querySelector('textarea')) || filtered[0] || null;
  }

  function isLikelyCloseButton(btn) {
    if (!btn || !isVisibleElement(btn)) return false;
    const tokens = [
      btn.textContent || '',
      btn.getAttribute('aria-label') || '',
      btn.getAttribute('title') || '',
      btn.getAttribute('mattooltip') || '',
      btn.getAttribute('data-tooltip') || '',
      btn.className || ''
    ].join(' ').trim();
    return /^x$/i.test(tokens) ||
      /\bclose\b/i.test(tokens) ||
      /닫기/.test(tokens) ||
      /cancel/i.test(tokens) ||
      /clear/i.test(tokens);
  }

  function findStudioPromptCloseButton(container) {
    if (!container) return null;
    const buttons = queryAllIncludingShadow(container, 'button, [role="button"]')
      .filter((btn) => btn !== container && isLikelyCloseButton(btn));
    if (buttons.length) return buttons[0];

    // Fallback: use the top-right visible button inside a dialog-like header row.
    const topButtons = queryAllIncludingShadow(container, 'button, [role="button"]')
      .filter((btn) => btn !== container && isVisibleElement(btn))
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        if (ar.top !== br.top) return ar.top - br.top;
        return br.right - ar.right;
      });
    return topButtons[0] || null;
  }

  function findStudioPromptHeader(container, closeBtn) {
    if (!container) return null;
    if (closeBtn) {
      let row = closeBtn.parentElement;
      while (row && row !== container) {
        const heading = row.querySelector('h1, h2, h3, h4, [class*="title"], [class*="header"]');
        if (heading || row === closeBtn.parentElement) return row;
        row = row.parentElement;
      }
    }
    const heading = container.querySelector('h1, h2, h3, h4, [class*="title"], [class*="header"]');
    return heading?.parentElement || null;
  }

  function findStudioPromptTextarea() {
    const container = findStudioPromptContainer();
    if (!container) return null;
    const textareas = Array.from(queryAllIncludingShadow(container, 'textarea')).filter(isVisibleElement);
    return textareas[textareas.length - 1] || null;
  }

  function setTextareaValue(textarea, text) {
    if (!textarea) return false;
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (descriptor?.set) descriptor.set.call(textarea, text);
    else textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    return true;
  }

  function findStudioGenerateButton() {
    const container = findStudioPromptContainer();
    if (!container) return null;
    const buttons = Array.from(queryAllIncludingShadow(container, 'button, [role="button"]')).filter(isVisibleElement);
    const keywords = [
      'Generate', 'Create', 'Submit', 'Run', 'Start', 'Go',
      '만들기', '생성', '실행', '시작', '제출', '적용', '확인'
    ];
    return buttons.find((btn) => {
      const textValue = `${btn.textContent || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`.trim();
      return keywords.some((keyword) => textValue.includes(keyword));
    }) || null;
  }

  async function applyPromptToStudioInput(text, runImmediately = false) {
    const textarea = findStudioPromptTextarea();
    if (!textarea) return { ok: false, reason: 'studio_input_not_found' };
    setTextareaValue(textarea, text || '');
    if (runImmediately) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const generateBtn = findStudioGenerateButton();
      if (generateBtn) {
        generateBtn.click();
        return { ok: true, executed: true, target: 'studio' };
      }
    }
    return { ok: true, executed: false, target: 'studio' };
  }

  function findNotebookLMSendButton() {
    const panel = document.querySelector('section.chat-panel') || document.querySelector('chat-panel');
    if (!panel) return null;
    const box = panel.querySelector('query-box');
    if (!box) return null;
    const form = box.querySelector('form');
    const container = form || box;
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.type === 'submit') return btn;
      const icon = btn.querySelector('mat-icon');
      const iconText = icon ? icon.textContent.trim() : '';
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (iconText === 'send' || iconText === 'arrow_upward' || iconText === 'keyboard_arrow_up' || label.includes('send') || label.includes('전송') || label.includes('제출')) {
        return btn;
      }
    }
    if (form) {
      const submit = form.querySelector('button[type="submit"]');
      if (submit) return submit;
    }
    return null;
  }

  function pasteAndExecute(text, runImmediately, sendResponse) {
    const textarea = findNotebookLMInput();
    if (!textarea) {
      sendResponse?.({ ok: false, reason: 'input_not_found' });
      return;
    }
    setTextareaValue(textarea, text || '');

    if (!runImmediately) {
      sendResponse?.({ ok: true, executed: false });
      return;
    }
    const submitBtn = findNotebookLMSendButton();
    if (submitBtn) {
      setTimeout(() => submitBtn.click(), 80);
      sendResponse?.({ ok: true, executed: true });
    } else {
      const form = textarea.closest('form');
      if (form) {
        setTimeout(() => form.requestSubmit(), 80);
        sendResponse?.({ ok: true, executed: true });
      } else {
        sendResponse?.({ ok: true, executed: false });
      }
    }
  }

  function findLastCopyButton() {
    const panel = document.querySelector('section.chat-panel') || document.querySelector('chat-panel');
    if (!panel) return null;
    const messages = panel.querySelectorAll('chat-message');
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const actions = msg.querySelector('chat-actions') || msg.querySelector('mat-card-actions chat-actions');
      if (!actions) continue;
      const buttons = actions.querySelectorAll('button');
      for (const btn of buttons) {
        const icon = btn.querySelector('mat-icon');
        const iconText = icon ? icon.textContent.trim() : '';
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (iconText === 'content_copy' || iconText === 'copy' || label.includes('copy') || label.includes('복사')) {
          return btn;
        }
      }
      if (buttons.length >= 2) return buttons[1];
      if (buttons.length >= 1) return buttons[0];
    }
    return null;
  }

  function clickCopyButton() {
    const btn = findLastCopyButton();
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /** HTML/DOM → Markdown 변환 (양식 유지) */
  function domToMarkdown(node) {
    if (!node) return '';
    const BLOCK = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'HR'];

    function walk(n) {
      if (!n) return '';
      if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ').trim();
      if (n.nodeType !== 1) return '';
      const tag = (n.tagName || '').toUpperCase();
      const parts = Array.from(n.childNodes).map(walk).filter(Boolean);
      const inner = parts.join(tag === 'LI' ? ' ' : '');
      const sep = BLOCK.includes(tag) ? '\n' : '';

      switch (tag) {
        case 'H1': return sep + '# ' + inner + sep + sep;
        case 'H2': return sep + '## ' + inner + sep + sep;
        case 'H3': return sep + '### ' + inner + sep + sep;
        case 'H4': return sep + '#### ' + inner + sep + sep;
        case 'H5': return sep + '##### ' + inner + sep + sep;
        case 'H6': return sep + '###### ' + inner + sep + sep;
        case 'STRONG':
        case 'B': return '**' + inner + '**';
        case 'EM':
        case 'I': return '*' + inner + '*';
        case 'CODE': return n.closest('pre') ? inner : '`' + inner + '`';
        case 'PRE': return sep + '```' + sep + (n.textContent || '').trim() + sep + '```' + sep + sep;
        case 'A': return '[' + inner + '](' + (n.getAttribute('href') || '') + ')';
        case 'BR':
        case 'HR': return '\n';
        case 'LI': return '- ' + inner.replace(/\n+/g, ' ').trim() + '\n';
        case 'UL':
        case 'OL': return sep + parts.join('') + sep;
        case 'BLOCKQUOTE': return sep + '> ' + inner.split('\n').join('\n> ') + sep + sep;
        case 'P': return sep + inner + sep + sep;
        case 'DIV':
        case 'SPAN': return inner + (n.querySelector('p, h1, h2, h3, ul, ol') ? '' : (inner ? sep : ''));
        default: return inner;
      }
    }
    return walk(node).replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '').trim();
  }

  function htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') return '';
    const div = document.createElement('div');
    div.innerHTML = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    return domToMarkdown(div);
  }

  function getFullMessageTextFromDOM(buttonElement) {
    const msg = buttonElement.closest('chat-message') || buttonElement.closest('[class*="message"]') || buttonElement.closest('[role="article"]') || buttonElement.parentElement?.closest('chat-message');
    if (!msg) return '';
    let card = msg.querySelector('mat-card') || msg.querySelector('[class*="card"]') || msg.querySelector('[class*="content"]');
    if (!card) {
      const inShadow = queryAllIncludingShadow(msg, 'mat-card, [class*="card"], [class*="content"]');
      card = inShadow[0] || msg;
    }
    const clone = card.cloneNode(true);
    const actionsToRemove = clone.querySelector('mat-card-actions') || clone.querySelector('chat-actions') || clone.querySelector('[class*="actions"]');
    if (actionsToRemove) actionsToRemove.remove();
    const md = domToMarkdown(clone);
    return md || (clone.innerText || clone.textContent || '').trim();
  }

  function getLastMessageText() {
    const btn = findLastCopyButton();
    if (!btn) return '';
    return getFullMessageTextFromDOM(btn);
  }

  /** DOM 추출 + 복사 버튼 클릭 후 클립보드 읽기 → Markdown 양식 유지, 더 긴 쪽 반환 */
  async function getLastMessageTextFull() {
    const btn = findLastCopyButton();
    if (!btn) return '';
    const domMarkdown = getFullMessageTextFromDOM(btn);
    btn.click();
    await new Promise(r => setTimeout(r, 500));

    let clipboardText = '';
    let clipboardHtml = '';
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/html')) {
          clipboardHtml = await item.getType('text/html').then(blob => blob.text());
          break;
        }
      }
      if (!clipboardHtml) {
        clipboardText = await navigator.clipboard.readText();
      } else {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch (e) {
      try { clipboardText = await navigator.clipboard.readText(); } catch (_) {}
    }

    const clipboardMarkdown = clipboardHtml ? htmlToMarkdown(clipboardHtml) : clipboardText;
    const candidates = [domMarkdown, clipboardMarkdown, clipboardText].filter(Boolean);
    if (candidates.length === 0) return domMarkdown || clipboardText || '';
    return candidates.sort((a, b) => b.length - a.length)[0];
  }


  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleSidebar') {
      if (toggleSidebarFn) {
        toggleSidebarFn();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, reason: 'scholar_notebooklm_off' });
      }
    } else if (message.action === 'pasteAndExecute') {
      const runImmediately = message.runImmediately !== false;
      pasteAndExecute(message.text || '', runImmediately, sendResponse);
      return true;
    } else if (message.action === 'clickCopyButton') {
      const ok = clickCopyButton();
      sendResponse({ ok });
    } else if (message.action === 'getLastMessageText') {
      getLastMessageTextFull().then(text => {
        sendResponse({ ok: !!text, text });
      }).catch(() => sendResponse({ ok: false, text: '' }));
      return true;
    } else if (message.action === 'applyPromptToStudio') {
      applyPromptToStudioInput(message.text || '', message.runImmediately === true)
        .then((result) => sendResponse(result || { ok: true }))
        .catch((e) => sendResponse({ ok: false, err: String(e) }));
      return true;
    } else if (message.action === 'clearNotebookLMInput') {
      const textarea = findNotebookLMInput();
      if (!textarea) {
        sendResponse({ ok: false });
        return true;
      }
      textarea.focus();
      textarea.select();
      textarea.value = '';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ ok: true });
    }
    return true;
  });

  function initPromptsButton() {
    const existingPrompts = document.getElementById(PROMPTS_HEADER_BTN_ID);
    const existingMd = document.getElementById(MD_EDITOR_HEADER_BTN_ID);
    if (existingPrompts?.isConnected && existingMd?.isConnected) {
      repositionMDEditorHeaderButton(existingMd);
      syncMDEditorHeaderButtonVisibility(existingMd);
      return true;
    }

    const settingsEl = document.querySelector('title-bar-settings');
    const container = document.querySelector('.notebook-header-buttons-container');
    const target = settingsEl || container;
    if (!target) return false;

    let btn = document.getElementById(PROMPTS_HEADER_BTN_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = PROMPTS_HEADER_BTN_ID;
      btn.textContent = 'prompts';
      btn.title = '저장된 프롬프트';
      btn.style.cssText = `
        margin-left: 8px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        background: #334155;
        border: 1px solid #475569;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.2s, color 0.2s;
      `;
      btn.onmouseover = () => {
        btn.style.background = '#475569';
        btn.style.color = '#e2e8f0';
      };
      btn.onmouseout = () => {
        btn.style.background = '#334155';
        btn.style.color = '#94a3b8';
      };
      btn.onclick = () => {
        chrome.runtime.sendMessage({ action: 'openPromptsWindow' }, (res) => {
          if (!res?.ok) window.open(chrome.runtime.getURL('prompts/prompts.html'), '_blank', 'width=900,height=750');
        });
      };
      
      if (settingsEl) {
        settingsEl.insertAdjacentElement('afterend', btn);
      } else if (container) {
        container.appendChild(btn);
      }
    }

    let mdBtn = document.getElementById(MD_EDITOR_HEADER_BTN_ID);
    if (!mdBtn) {
      mdBtn = document.createElement('button');
      mdBtn.id = MD_EDITOR_HEADER_BTN_ID;
      mdBtn.textContent = 'MDEditor';
      mdBtn.title = 'Markdown Editor 열기';
      mdBtn.style.cssText = `
        margin-left: 8px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        background: #334155;
        border: 1px solid #475569;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.2s, color 0.2s;
      `;
      mdBtn.onmouseover = () => {
        mdBtn.style.background = '#475569';
        mdBtn.style.color = '#e2e8f0';
      };
      mdBtn.onmouseout = () => {
        mdBtn.style.background = '#334155';
        mdBtn.style.color = '#94a3b8';
      };
      mdBtn.onclick = async () => {
        const url = await getConfiguredToMDUrl();
        openConfiguredToMD(url);
      };
    }

    repositionMDEditorHeaderButton(mdBtn);
    syncMDEditorHeaderButtonVisibility(mdBtn);
    return true;
  }

  function tryInitPromptsButton() {
    if (initPromptsButton()) return;
    const obs = new MutationObserver(() => {
      if (initPromptsButton()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 25000);
  }

  /** chat-message 내 복사 버튼 찾기 (Shadow DOM 포함) */
  function findCopyButtonInMessage(msg) {
    const actionSelectors = ['chat-actions', 'mat-card-actions chat-actions', 'mat-card-actions', '[class*="actions"]'];
    let actions = null;
    for (const sel of actionSelectors) {
      actions = msg.querySelector(sel);
      if (actions) break;
    }
    if (!actions) {
      const found = queryAllIncludingShadow(msg, 'chat-actions, mat-card-actions, [class*="actions"]');
      actions = found.find(el => el.querySelector('button') || el.querySelector('[role="button"]'));
    }
    if (!actions) return null;
    const buttons = actions.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      const icon = btn.querySelector('mat-icon');
      const iconText = icon ? icon.textContent.trim() : '';
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (iconText === 'content_copy' || iconText === 'copy' || label.includes('copy') || label.includes('복사')) return btn;
    }
    return buttons.length >= 1 ? buttons[0] : null;
  }

  /** 클립보드에서 HTML/텍스트 읽어 마크다운 원문 우선 반환 */
  async function readClipboardAsMarkdown() {
    let clipboardText = '';
    let clipboardHtml = '';
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/html')) {
          clipboardHtml = await item.getType('text/html').then(blob => blob.text());
          break;
        }
      }
      clipboardText = await navigator.clipboard.readText();
    } catch (e) {
      try { clipboardText = await navigator.clipboard.readText(); } catch (_) {}
    }
    const clipboardMarkdown = clipboardHtml ? htmlToMarkdown(clipboardHtml) : clipboardText;
    return { clipboardMarkdown, clipboardText };
  }

  /** 마크다운 문법 포함 여부 (**, ##, -, > 등) */
  function hasMarkdownSyntax(text) {
    if (!text || text.length < 2) return false;
    return /\*\*[^*]+\*\*|\*[^*]+\*|^#+\s|^-\s|^>\s|\[.+\]\(.+\)|```/m.test(text);
  }

  /** 메시지 전체 텍스트 추출 (마크다운 원문 우선) */
  async function getMessageTextForToMD(msg) {
    const copyBtn = findCopyButtonInMessage(msg);
    if (!copyBtn) return '';
    const domMarkdown = getFullMessageTextFromDOM(copyBtn);
    copyBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const { clipboardMarkdown, clipboardText } = await readClipboardAsMarkdown();
    const candidates = [domMarkdown, clipboardMarkdown, clipboardText].filter(Boolean);
    if (candidates.length === 0) return domMarkdown || clipboardText || '';
    const withMd = candidates.filter(c => hasMarkdownSyntax(c));
    const pool = withMd.length > 0 ? withMd : candidates;
    return pool.sort((a, b) => b.length - a.length)[0];
  }

  const MSG_BTN_MARKER = 'data-scholar-msg-btns-injected';

  /** 메시지 내 액션 바(스크랩/ToMD 넣을 컨테이너) 찾기 */
  function findMessageActionsContainer(msg) {
    try {
      const selectors = ['chat-actions', 'mat-card-actions chat-actions', 'mat-card-actions', '[class*="chat-actions"]', '[class*="message-actions"]'];
      for (const sel of selectors) {
        const el = msg.querySelector(sel);
        if (el && (el.querySelector('button') || el.querySelector('[role="button"]'))) return el;
      }
      const withShadow = queryAllIncludingShadow(msg, 'chat-actions, mat-card-actions');
      for (const el of withShadow) {
        if (el.querySelector('button') || el.querySelector('[role="button"]')) return el;
      }
    } catch (_) {}
    return null;
  }

  /** '메모에 저장' 버튼 근처에 액션 바가 있는 컨테이너 찾기 (fallback) */
  function findActionBarByMemoButton() {
    try {
      const memoKeywords = ['메모에 저장', 'Save to Memo', 'Save to memo', 'memo'];
      const panel = document.querySelector('section.chat-panel') || document.querySelector('chat-panel');
      const root = panel || document.body;
      const allButtons = root.querySelectorAll('button, [role="button"]');
      for (const btn of allButtons) {
      const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
      if (!memoKeywords.some(k => text.includes(k))) continue;
      let container = btn.parentElement;
      for (let i = 0; i < 6 && container; i++) {
        const hasCopyOrThumbs = container.textContent && (
          /content_copy|copy|복사|thumb_up|thumb_down|thumbs/i.test(container.innerHTML || '') ||
          container.querySelectorAll('button, [role="button"]').length >= 2
        );
        if (hasCopyOrThumbs && !container.querySelector(`[${MSG_BTN_MARKER}]`)) return { container, isFallback: true };
        container = container.parentElement;
      }
    }
    return null;
    } catch (_) { return null; }
  }

  function createScrapAndToMDButtons(msg) {
    const scrapBtn = document.createElement('button');
    scrapBtn.type = 'button';
    scrapBtn.textContent = '스크랩';
    scrapBtn.title = '이 답변을 스크랩';
    scrapBtn.style.cssText = `
      margin-left: 8px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      background: #2563eb;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    `;
    scrapBtn.onmouseover = () => { scrapBtn.style.background = '#1d4ed8'; };
    scrapBtn.onmouseout = () => { scrapBtn.style.background = '#2563eb'; };
    scrapBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = await getMessageTextForToMD(msg);
      if (!text?.trim()) return;
      try {
        const data = await chrome.storage.local.get('accumulatedScraps');
        const list = data?.accumulatedScraps || [];
        list.push({ id: Date.now(), content: text, ts: new Date().toISOString() });
        await chrome.storage.local.set({ scrappedContent: text, accumulatedScraps: list });
      } catch (_) {}
    };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'ToMD';
    btn.title = 'ToMD로 보내기 (클립보드 복사 후 mdproviewer 열기)';
    btn.style.cssText = `
      margin-left: 8px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #ea580c;
      background: transparent;
      border: 1px solid rgba(234,88,12,0.5);
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s, color 0.2s;
    `;
    btn.onmouseover = () => {
      btn.style.background = 'rgba(234,88,12,0.15)';
      btn.style.color = '#f97316';
    };
    btn.onmouseout = () => {
      btn.style.background = 'transparent';
      btn.style.color = '#ea580c';
    };
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = await getMessageTextForToMD(msg);
      if (!text) {
        const ta = document.createElement('textarea');
        ta.value = '복사할 내용을 찾을 수 없습니다.';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return;
      }
      if (!await confirmToMDSave('https://mdproviewer.vercel.app/')) return;
      const openToMD = async () => {
        const url = await getConfiguredToMDUrl();
        openConfiguredToMD(url);
      };
      try {
        await chrome.storage.local.set({ scholarToMDPaste: text });
        await new Promise(r => setTimeout(r, 150));
        await openToMD();
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        await openToMD();
      }
    };
    const wrap = document.createElement('div');
    wrap.setAttribute(MSG_BTN_MARKER, '1');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
    wrap.appendChild(scrapBtn);
    wrap.appendChild(btn);
    return wrap;
  }

  function injectMessageActionButtons(msg) {
    if (msg.getAttribute(MSG_BTN_MARKER)) return;
    const actions = findMessageActionsContainer(msg);
    if (actions) {
      const wrap = createScrapAndToMDButtons(msg);
      actions.appendChild(wrap);
      msg.setAttribute(MSG_BTN_MARKER, '1');
    }
  }

  /** 메모에 저장 버튼 근처에 스크랩/ToMD 추가 (fallback - msg는 해당 툴바가 속한 메시지 블록) */
  function injectButtonsViaMemoFallback() {
    const found = findActionBarByMemoButton();
    if (!found) return;
    const { container } = found;
    if (container.querySelector(`[${MSG_BTN_MARKER}]`)) return;
    const msg = container.closest('chat-message') || container.closest('[class*="message"]') || container.closest('[role="article"]') || container;
    const wrap = createScrapAndToMDButtons(msg);
    container.appendChild(wrap);
  }

  function injectMessageActionButtonsAll() {
    try {
      const panelSelectors = ['section.chat-panel', 'chat-panel', '[class*="chat-panel"]', '[class*="ChatPanel"]'];
      let panel = null;
      for (const sel of panelSelectors) {
        panel = document.querySelector(sel);
        if (panel) break;
      }
      if (panel) {
        const messages = panel.querySelectorAll('chat-message');
        messages.forEach(injectMessageActionButtons);
      }
      injectButtonsViaMemoFallback();
    } catch (e) { console.warn('[Scholar] injectMessageActionButtonsAll:', e); }
  }

  function initMessageActionButtons() {
    injectMessageActionButtonsAll();
    let scheduled = false;
    const scheduleRun = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        injectMessageActionButtonsAll();
        scheduled = false;
      });
    };
    const obs = new MutationObserver(scheduleRun);
    const panel = document.querySelector('section.chat-panel') || document.querySelector('chat-panel') || document.body;
    obs.observe(panel, { childList: true, subtree: true });
    setTimeout(injectMessageActionButtonsAll, 2000);
    setTimeout(injectMessageActionButtonsAll, 5000);
  }

  /** 소스 행 클릭 (원문 보기 패널 갱신) - 행 중앙~오른쪽 텍스트 영역 클릭 (왼쪽 아이콘 영역 피해 컨텍스트 메뉴 방지) */
  function clickSourceToRevealContent(row) {
    try {
      const rect = row.getBoundingClientRect();
      const midX = rect.left + rect.width * 0.45;
      const midY = rect.top + rect.height / 2;
      const el = document.elementFromPoint(midX, midY);
      if (el && row.contains(el)) {
        el.click();
        return;
      }
    } catch (_) {}
    const targets = [
      row.querySelector('[class*="title"], [class*="name"], [class*="source-name"], [role="link"]'),
      row.querySelector('a[href]'),
      row
    ].filter(Boolean);
    for (const target of targets) {
      try {
        target.click();
        return;
      } catch (_) {}
    }
    try { row.click(); } catch (_) {}
  }

  /** 소스 행 펼치기 (확장 버튼 클릭) */
  function tryExpandSourceRow(row) {
    const expandBtn = row.querySelector('[class*="expand"], [class*="Expand"], [aria-expanded], [class*="chevron"], button[aria-label*="expand"], button[aria-label*="펼치"]');
    if (expandBtn) {
      try {
        const expanded = expandBtn.getAttribute('aria-expanded');
        if (expanded === 'false' || !expanded) expandBtn.click();
      } catch (_) {}
    }
  }

  /** 중앙 패널(소스 뷰어) 영역인지 확인 - 좌측 소스목록과 우측 스튜디오 사이 */
  function isInCenterPanel(el) {
    try {
      const rect = el?.getBoundingClientRect?.();
      if (!rect) return true;
      const left = rect.left;
      const w = window.innerWidth;
      return left > w * 0.05 && left < w * 0.88;
    } catch (_) { return true; }
  }

  /** 소스 뷰어 패널(원문 보기/소스 가이드 영역)에서 본문 추출, 마크다운 유지 */
  function extractSourceViewerAsMarkdown() {
    const excludeChat = (el) => el?.closest?.('section.chat-panel') || el?.closest?.('chat-panel') || el?.closest?.('query-box');
    const excludeStudio = (el) => el?.closest?.('[class*="studio"]') && el?.getBoundingClientRect?.().left > window.innerWidth * 0.6;
    const selectors = '[class*="chunk"], [class*="Chunk"], [class*="document"], [class*="viewer"], [class*="guide"], [class*="preview"], [class*="content"], [class*="source-guide"], [class*="source-preview"], [class*="SourcePreview"], [class*="source-viewer"], [class*="SourceViewer"], [class*="grounded"], [class*="citation"], [class*="reference"], [class*="markdown"], [class*="outline"], article, [role="article"]';
    const candidates = queryAllIncludingShadow(document.body, selectors);
    let best = { md: '', len: 0 };
    for (const el of candidates) {
      if (excludeChat(el)) continue;
      try { if (excludeStudio(el)) continue; } catch (_) {}
      if (!isInCenterPanel(el)) continue;
      const md = domToMarkdown(el);
      let t = (md || el.innerText || '').trim();
      t = t.replace(/\b(button_magic|arrow_drop_up|arrow_drop_down|more_horiz)\s*/gi, '').trim();
      if (t.length < 50) continue;
      if (t === 'markdown' || (t.startsWith('markdown\n') && t.length < 200)) continue;
      const lineCount = (t.match(/\n/g) || []).length;
      if (lineCount < 1 && t.length < 200) continue;
      if (t.length > best.len) best = { md: t, len: t.length };
    }
    return best.md;
  }

  /** 소스 상세/뷰어 패널에서 본문 텍스트 추출 (fallback) */
  function extractSourceViewerText() {
    const excludeChat = (el) => el?.closest?.('section.chat-panel') || el?.closest?.('chat-panel') || el?.closest?.('query-box');
    const excludeStudio = (el) => el?.closest?.('[class*="studio"]') && el?.getBoundingClientRect?.().left > window.innerWidth * 0.6;
    const selectors = '[class*="chunk"], [class*="Chunk"], [class*="document"], [class*="viewer"], [class*="guide"], [class*="preview"], [class*="content"], [class*="source-preview"], [class*="source-viewer"], [class*="grounded"], [class*="citation"], article, [role="article"]';
    const candidates = queryAllIncludingShadow(document.body, selectors);
    let best = '';
    for (const el of candidates) {
      if (excludeChat(el)) continue;
      try { if (excludeStudio(el)) continue; } catch (_) {}
      if (!isInCenterPanel(el)) continue;
      let t = (el.innerText || '').trim().replace(/\b(button_magic|arrow_drop_up|arrow_drop_down|more_horiz)\s*/gi, '');
      if (t.length < 50) continue;
      if (t === 'markdown' || (t.startsWith('markdown\n') && t.length < 200)) continue;
      if (t.length > best.length) best = t;
    }
    return best;
  }

  /** 소스 행 내부에서 본문 추출 (행이 펼쳐져 있을 때) */
  function extractContentFromRow(row) {
    if (!row) return '';
    const contentSelectors = '[class*="chunk"], [class*="Chunk"], [class*="content"], [class*="body"], [class*="text"], [class*="preview"], [class*="guide"], [class*="markdown"]';
    const contentEl = row.querySelector(contentSelectors);
    if (contentEl) {
      const md = domToMarkdown(contentEl);
      const t = (md || contentEl.innerText || '').trim();
      if (t.length > 100 && !t.startsWith('markdown')) return t;
    }
    const allText = (row.innerText || '').trim();
    const title = getSourceTitle(row);
    const withoutTitle = allText.replace(title, '').trim();
    if (withoutTitle.length > 150) return withoutTitle;
    return '';
  }

  /** 소스 행에서 제목 추출 */
  function getSourceTitle(row) {
    const titleEl = row?.querySelector('[class*="title"], [class*="name"], [class*="label"], label, [class*="source-name"]');
    if (titleEl?.innerText?.trim()) return titleEl.innerText.trim();
    const full = (row?.innerText || '').trim();
    const firstLine = full.split('\n')[0]?.replace(/^\s*[\u2713\u2714\u2610\u2611]\s*/, '').trim();
    if (firstLine && firstLine.length > 2 && firstLine.length < 200) return firstLine;
    return '소스 ' + (row?.textContent?.length || 0);
  }

  /** 체크된 소스 없을 때: 화면에 보이는 첫 소스 행들 (클릭 후 추출용) - 체크박스 있는 행만 */
  function getFirstVisibleSourceRows() {
    const allCheckboxes = queryAllIncludingShadow(document.body, 'input[type="checkbox"]');
    const rows = [];
    const seen = new WeakSet();
    const w = window.innerWidth;
    for (const cb of allCheckboxes) {
      try {
        if (cb.getBoundingClientRect?.().left >= w * 0.55) continue;
        const label = (cb.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('모든 소스') || label.includes('select all')) continue;
        const row = cb.closest('[role="row"], [class*="source"], [class*="Source"], [class*="item"], [class*="list"], [class*="row"], li, tr, [role="listitem"]');
        if (!row || seen.has(row)) continue;
        const rect = row.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) continue;
        const txt = (row.textContent || '').trim();
        if (txt.length < 10) continue;
        if (row.closest('section.chat-panel') || row.closest('chat-panel')) continue;
        seen.add(row);
        rows.push(row);
        if (rows.length >= 5) break;
      } catch (_) {}
    }
    return rows;
  }

  /** 체크된 소스 목록 (개별 소스만, '모든 소스 선택' 제외) */
  function getCheckedSourceRows() {
    const allChecked = queryAllIncludingShadow(document.body, 'input[type="checkbox"]:checked');
    const rows = [];
    const seen = new WeakSet();
    for (const cb of allChecked) {
      try {
        if (cb.getBoundingClientRect?.().left >= window.innerWidth * 0.55) continue;
      } catch (_) { continue; }
      const row = cb.closest('[role="row"], [class*="source"], [class*="Source"], [class*="item"], [class*="list"], [class*="row"], li, tr, [role="listitem"]');
      if (!row || seen.has(row)) continue;
      const label = (cb.getAttribute('aria-label') || row.textContent || '').toLowerCase();
      if (label.includes('모든 소스') || label.includes('select all')) continue;
      seen.add(row);
      rows.push(row);
    }
    return rows;
  }

  /** 뷰어 콘텐츠가 이전과 달라질 때까지 대기 (최대 2.5초) */
  async function waitForContentChange(prevContent, maxMs) {
    const start = Date.now();
    while (Date.now() - start < (maxMs || 2500)) {
      const curr = extractSourceViewerAsMarkdown() || extractSourceViewerText();
      const prev = (prevContent || '').slice(0, 200);
      const currHead = (curr || '').slice(0, 200);
      if (curr && curr.length > 50 && prev !== currHead) return curr;
      await new Promise(r => setTimeout(r, 250));
    }
    return extractSourceViewerAsMarkdown() || extractSourceViewerText();
  }

  /** 중앙 패널에 표시된 소스 텍스트 직접 추출 (좌측 클릭 없이) */
  function extractCenterPanelText() {
    // Explicitly prevent grabbing chat history if fallback fires
    let content = '';
    const panels = document.querySelectorAll('source-viewer, section.source-panel-view, [class*="source-viewer"], [class*="SourceViewer"]');
    for (const panel of panels) {
      if (isInChatArea(panel)) continue;
      const viewer = panel.querySelector('labs-tailwind-doc-viewer, [class*="chunk"], article, [class*="markdown"], .content');
      if (viewer) {
        const md = domToMarkdown(viewer);
        content = (md || viewer.innerText || '').trim();
        if (content.length > 50) break;
      }
    }
    
    if (!content || content.length < 50) {
       content = extractSourceViewerAsMarkdown() || extractSourceViewerText();
    }
    
    if (content) {
      content = content.replace(/\b(button_magic|arrow_drop_up|arrow_drop_down|more_horiz)\s*/gi, '').trim();
    }
    return content || '';
  }

  /** source-panel-view > source-viewer > labs-tailwind-doc-viewer 에서 본문 추출 */
  function extractFromDocViewer() {
    const panels = document.querySelectorAll('source-viewer, section.source-panel-view, [class*="source-viewer"], [class*="SourceViewer"]');
    for (const panel of panels) {
      if (isInChatArea(panel)) continue;
      const viewer = panel.querySelector('labs-tailwind-doc-viewer, [class*="chunk"], article, [class*="markdown"], .content');
      if (viewer) {
        const md = domToMarkdown(viewer);
        const t = (md || viewer.innerText || '').trim().replace(/\b(button_magic|arrow_drop_up|arrow_drop_down|more_horiz)\s*/gi, '');
        if (t.length > 50) return t;
      }
    }
    return '';
  }

  /** source-panel 내 체크된 mat-mdc-checkbox에 해당하는 소스 행(버튼) 혹은 래퍼 목록 */
  function getCheckedSourceRowsFromPanel() {
    const panel = document.querySelector('section.source-panel') || document.body;
    // 1. 체크된 소스 요소 찾기
    const checked = panel.querySelectorAll('source-picker input[type="checkbox"]:checked, input[id^="mat-mdc-checkbox-"]:checked, input[type="checkbox"]:checked');
    const rows = [];
    const seen = new WeakSet();
    for (const cb of checked) {
      const label = (cb.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('모든 소스') || label.includes('select all')) continue;
      // 2. 텍스트가 있는 부모 요소 (.ng-star-inserted 등) 식별 - input 체크박스 자체가 아닌 래퍼를 클릭하도록 보장
      let row = cb.closest('button, [role="button"], [role="row"]');
      if (!row) row = cb.closest('.ng-star-inserted');
      if (!row) row = cb.parentElement;
      if (!row || seen.has(row)) continue;
      seen.add(row);
      rows.push(row);
    }
    return rows;
  }

  function closeSourcePanelView() {
    try {
      const specificIcon = document.querySelector('section.source-panel-view div.panel-header button mat-icon, section.source-panel-view div[class*="panel-header"] button mat-icon');
      if (specificIcon) { specificIcon.click(); return; }
      const specificBtn = document.querySelector('section.source-panel-view div.panel-header button, section.source-panel-view div[class*="panel-header"] button');
      if (specificBtn) { specificBtn.click(); return; }
      const panelView = document.querySelector('section.source-panel-view');
      if (panelView) {
        const headerBtn = panelView.querySelector('div[class*="header"] button');
        if (headerBtn) headerBtn.click();
      }
    } catch (_) {}
  }

  /** 소스 추출: 1) source-panel 체크된 항목 클릭 후 docs 뷰어 데이터 추출 (HTML->MD 변환) */
  async function getSelectedSourcesContent() {
    const rows = getCheckedSourceRowsFromPanel();
    if (rows.length > 0) {
      const items = [];
      let lastContent = '';
      for (const row of rows) {
        row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        await new Promise(r => setTimeout(r, 200));
        
        // 패널 오픈 상태 확인: 만약 상세 패널이 이미 열려 있는 요소라면 불필요한 클릭 방지
        const isExpanded = row.getAttribute('aria-expanded') === 'true' || row.classList.contains('active') || row.classList.contains('selected');
        
        if (!isExpanded) {
           try {
             // 체크박스 옆의 텍스트 제목 노드를 콕 집어서 클릭
             const titleEl = row.querySelector('[class*="title"], [class*="name"], [class*="source-name"], [class*="label"], [class*="text"]');
             if (titleEl && (titleEl.textContent || '').trim().length > 0) {
               titleEl.click();
             } else {
               const texts = Array.from(row.querySelectorAll('span, p, div')).filter(el => (el.textContent || '').trim().length > 2 && el.tagName !== 'MAT-ICON');
               if (texts.length > 0) {
                 texts[0].click();
               } else {
                 row.click();
               }
             }
           } catch (_) {}
           // 상세 패널 로드 대기 (Soft delay)
           await new Promise(r => setTimeout(r, 800));
        }

        let content = '';
        for (let retry = 0; retry < 3; retry++) {
          // 데이터 정제: DOM의 innerHTML 구조를 보존하면서 마크다운으로 변환하는 domToMarkdown 함수 사용
          content = extractFromDocViewer() || extractCenterPanelText();
          content = (content || '').replace(/\b(button_magic|arrow_drop_up|arrow_drop_down|more_horiz)\s*/gi, '').trim();
          if (content && content.length > 50) break;
          await new Promise(r => setTimeout(r, 500));
        }
        const title = (row.textContent || '').trim().replace(/^[\u2713\u2714\u2610\u2611]/, '').trim().slice(0, 80) || '소스';
        const isDup = items.some(it => (it.content || '').slice(0, 150) === (content || '').slice(0, 150));
        if (content && content.length > 50 && !isDup) {
          items.push({ title, content });
          lastContent = content;
        }
      }
      if (items.length > 0) return formatSourcesWithTitles(items);
      if (lastContent) return lastContent;
    }
    const direct = extractFromDocViewer() || extractCenterPanelText();
    if (direct && direct.length > 50) return direct;
    try {
      const clip = await navigator.clipboard?.readText?.();
      if (clip && clip.trim().length > 50) return clip.trim();
    } catch (_) {}
    return '';
  }

  /** 소스 목록을 제목으로 구분해 하나의 텍스트로 포맷 (본문만, 제목만 있는 항목 제외) */
  function formatSourcesWithTitles(items) {
    const valid = items.filter(it => it.content && it.content.trim().length > 50);
    if (valid.length === 0) return '';
    if (valid.length === 1) return valid[0].content;
    return valid.map(({ title, content }) => `## ${title}\n\n${content}`).join('\n\n---\n\n');
  }

  /** Studio 버튼용: 선택된 소스에서만 텍스트 추출 (소스 전용, AI/아티팩트 사용 안 함) */
  async function getStudioSourceText() {
    return await getSelectedSourcesContent();
  }

  const STUDIO_BTN_MARKER = 'data-scholar-studio-btns-injected';

  function queryAllIncludingShadow(root, selector) {
    const out = [];
    const walk = (el) => {
      try {
        out.push(...el.querySelectorAll(selector));
        el.querySelectorAll('*').forEach((child) => {
          if (child.shadowRoot) walk(child.shadowRoot);
        });
      } catch (_) {}
    };
    walk(root);
    return out;
  }

  function isInChatArea(el) {
    if (!el || !el.closest) return false;
    return !!(el.closest('section.chat-panel') || el.closest('chat-panel') || el.closest('query-box') || el.closest('[class*="chat-panel"]') || el.closest('[class*="query-box"]'));
  }

  function isOnRightSide(el) {
    if (!el?.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return rect.left > window.innerWidth * 0.45;
  }

  function findStudioGrid() {
    const studioKeywords = [
      'AI 오디오', '슬라이드 자료', '마인드맵', '보고서', '플래시카드', '퀴즈', '인포그래픽', '데이터 표', '동영상 개요',
      'AI Audio', 'Slide', 'Mind Map', 'Report', 'Flashcard', 'Quiz', 'Infographic', 'Data Table', 'Studio', 'Video Overview'
    ];
    const candidates = queryAllIncludingShadow(document.body, 'button, [role="button"], a[role="button"], [class*="tile"], [class*="card"], [class*="Tile"], [class*="Card"]');
    for (const btn of candidates) {
      if (isInChatArea(btn)) continue;
      const text = (btn.textContent || '').trim();
      if (studioKeywords.some(k => text.includes(k))) {
        let el = btn.parentElement;
        while (el && el !== document.body) {
          if (isInChatArea(el)) break;
          const directChildren = el.children?.length || 0;
          if (directChildren >= 4 && isOnRightSide(el)) return el;
          el = el.parentElement;
        }
        if (!isInChatArea(btn.parentElement) && isOnRightSide(btn.parentElement)) return btn.parentElement;
      }
    }
    const studioSelectors = [
      '.create-artifact-buttons-container',
      '.studio-panel', '[class*="studio-panel"]', '[class*="StudioPanel"]',
      'section[aria-label*="Studio"]', 'section[aria-label*="스튜디오"]',
      '[class*="artifact"]', '[class*="Artifact"]'
    ];
    for (const sel of studioSelectors) {
      const section = document.querySelector(sel);
      if (section && !isInChatArea(section) && isOnRightSide(section)) {
        if (sel === '.create-artifact-buttons-container') return section;
        const grid = section.querySelector('[class*="grid"], [class*="Grid"], [class*="container"], div');
        if (grid) return grid;
        return section;
      }
    }
    const headings = queryAllIncludingShadow(document.body, 'h2, h3, [class*="heading"], [class*="title"]');
    for (const h of headings) {
      if ((h.textContent || '').includes('스튜디오') || (h.textContent || '').includes('Studio')) {
        let parent = h.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          if (!isInChatArea(parent) && isOnRightSide(parent) && parent.children.length >= 4) return parent;
          parent = parent.parentElement;
        }
      }
    }
    return null;
  }

  /** 체크한 소스 행 클릭 → 본문 마크다운 추출 → storage 저장 → 새 탭 열기 → 해당 사이트 입력에 자동 붙여넣기 */
  function createStudioActionButton(label, url, storageKey) {
    const wrap = document.createElement('div');
    wrap.setAttribute(STUDIO_BTN_MARKER, '1');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 10px 10px 15px;background:rgba(51,65,85,0.5);color:rgba(226,232,240,0.95);border-radius:12px;cursor:pointer;font-weight:600;font-size:13px;height:70px;min-height:70px;width:100%;min-width:0;border:1px solid rgba(71,85,105,0.4);transition:background 0.15s,transform 0.1s;box-sizing:border-box;';
    wrap.title = label === 'Scholar Slide'
      ? '체크한 소스를 마크다운으로 추출해 scholarslide.vercel.app 입력에 붙여넣기'
      : '체크한 소스를 마크다운으로 추출해 mdproviewer.vercel.app 입력에 붙여넣기';
    wrap.onmouseover = () => { wrap.style.background = 'rgba(71,85,105,0.6)'; wrap.style.transform = 'scale(1.01)'; };
    wrap.onmouseout = () => { wrap.style.background = 'rgba(51,65,85,0.5)'; wrap.style.transform = 'scale(1)'; };
    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:16px;flex-shrink:0;';
    icon.textContent = label === 'Scholar Slide' ? '🚀' : '📖';
    const labelEl = document.createElement('span');
    labelEl.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    labelEl.textContent = label;
    wrap.appendChild(icon);
    wrap.appendChild(labelEl);
    wrap.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = await getStudioSourceText();
      if (!text?.trim()) {
        try {
          const ta = document.createElement('textarea');
          ta.value = '본문을 추출할 수 없습니다. 소스 패널에서 체크한 소스가 있는지 확인하고, 없으면 소스를 클릭해 본문을 띄운 뒤 버튼을 누르거나, 본문을 복사(Ctrl+C)한 뒤 버튼을 눌러 주세요.';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (_) {}
        return;
      }

      // Explicitly copy to clipboard as requested
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      let targetUrl = url;
      if (label === 'MDProViewer') {
        targetUrl = await getConfiguredToMDUrl();
      }
      if (label === 'MDProViewer' && !await confirmToMDSave(targetUrl)) return;
      if (label === 'Scholar Slide' && !await confirmScholarSlideSave(targetUrl)) return;

      const openUrl = async () => {
        let activeUrl = targetUrl;
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ action: 'openExternalPaste', url: activeUrl, storageKey }).catch(() => {
            window.open(activeUrl, '_blank', 'noopener,noreferrer');
          });
        } else {
          window.open(activeUrl, '_blank', 'noopener,noreferrer');
        }
      };
      
      try {
        await chrome.storage.local.set({ [storageKey]: text });
        await new Promise(r => setTimeout(r, 150));
        await openUrl();
      } catch (err) {
        await openUrl();
      }
      setTimeout(closeSourcePanelView, 500);
    };
    return wrap;
  }

  function injectStudioPromptLauncher() {
    const container = findStudioPromptContainer();
    if (!container) return false;
    const closeBtn = findStudioPromptCloseButton(container);
    const header = findStudioPromptHeader(container, closeBtn);
    const existing = document.querySelector('[data-scholar-studio-prompts="1"]');
    if (existing) {
      if (closeBtn?.parentElement && existing.parentElement !== closeBtn.parentElement) {
        closeBtn.parentElement.insertBefore(existing, closeBtn);
      } else if (header && existing.parentElement !== header) {
        header.appendChild(existing);
      }
      return true;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'prompts';
    btn.setAttribute('data-scholar-studio-prompts', '1');
    btn.style.cssText = 'margin-right:12px;padding:6px 10px;border:none;border-radius:8px;background:#334155;color:#e2e8f0;font-size:12px;font-weight:700;cursor:pointer;line-height:1;';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'openPromptsWindow' }, (res) => {
        if (!res?.ok) window.open(chrome.runtime.getURL('prompts/prompts.html'), '_blank', 'width=900,height=750');
      });
    });

    if (closeBtn?.parentElement) {
      closeBtn.parentElement.insertBefore(btn, closeBtn);
      return true;
    }

    if (header) {
      header.appendChild(btn);
      return true;
    }

    container.prepend(btn);
    return true;
  }

  function injectStudioButtons() {
    injectStudioPromptLauncher();
    const grid = findStudioGrid();
    if (!grid) return false;
    const existing = document.querySelectorAll(`[${STUDIO_BTN_MARKER}]`);
    for (const el of existing) {
      if (isInChatArea(el) || !isOnRightSide(el)) {
        el.remove();
      } else if (grid.contains(el)) {
        return true;
      }
    }
    if (grid.querySelector(`[${STUDIO_BTN_MARKER}]`)) return true;
    const scholarSlide = createStudioActionButton('Scholar Slide', 'https://scholarslide.vercel.app/', 'scholarScholarSlidePaste');
    const mdEditor = createStudioActionButton('MDProViewer', 'https://mdproviewer.vercel.app/', 'scholarToMDPaste');
    grid.appendChild(scholarSlide);
    grid.appendChild(mdEditor);
    return true;
  }

  function initStudioButtons() {
    let refreshPending = false;
    const refreshStudioUi = () => {
      refreshPending = false;
      injectStudioPromptLauncher();
      injectStudioButtons();
    };
    const scheduleRefresh = () => {
      if (refreshPending) return;
      refreshPending = true;
      setTimeout(refreshStudioUi, 250);
    };
    refreshStudioUi();
    const obs = new MutationObserver(() => scheduleRefresh());
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(scheduleRefresh, 1000);
    setTimeout(scheduleRefresh, 3000);
  }

  registerNotebookLMFeatureStorageListener();
  initCloseSatelliteWindowsOnUnload();
  initNotebookExitWatcher();

  function runScholarNotebookLMInit() {
    init();
    registerHideMDEditorHeaderStorageListener();
    tryInitPromptsButton();
    setTimeout(initMessageActionButtons, 800);
    setTimeout(initMessageActionButtons, 2500);
    setTimeout(initStudioButtons, 1000);
    setTimeout(initStudioButtons, 4000);
  }

  readNotebookLMFeatureEnabled((enabled) => {
    if (!enabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runScholarNotebookLMInit);
    } else {
      runScholarNotebookLMInit();
    }
  });
})();
