/**
 * NotebookLM 상단(타이틀 바 / 헤더 버튼 영역)에 붙이는 UI
 * UI 마크업: top-menu.html + top-menu.css
 * Google Scholar / 인용관리: RightHeader/Scholarref (ScholarSearchShell + ScholarRef)
 * content.js보다 먼저 로드되며 window.ScholarRightHeader 를 노출합니다.
 */
(function () {
  'use strict';

  const GEMINI_NOTEBOOK_VIEW_URL = 'https://gemini.google.com/notebooks/view';

  const IDS = {
    BTN_ID: 'scholar-assistant-float-btn',
    BTN_SMALL_ID: 'scholar-assistant-float-btn-small',
    MD_EDITOR_HEADER_BTN_ID: 'scholar-mdeditor-header-btn',
    GEMINI_NOTEBOOK_BTN_ID: 'scholar-rh-gemini-notebook-btn',
    /** 예전 빌드에서 헤더에 남은 노드 제거용 */
    PROMPTS_HEADER_BTN_ID: 'scholar-prompts-header-btn',
    HOST_ID: 'scholar-rh-top-menu-host',
    STORAGE_HIDE_MD_EDITOR_HEADER: 'hideMDEditorHeader',
    SCHOLAR_INLINE_QUERY: 'scholar-rh-inline-scholar-query',
    SCHOLAR_RUN_BTN: 'scholar-rh-scholar-run',
    SCHOLAR_POPUP_BTN: 'scholar-rh-scholar-popup',
    SCHOLAR_REF_BTN: 'scholar-rh-ref-btn',
    SCHOLAR_FOLDER_BTN: 'scholar-rh-folder-btn',
    LIBRARY_HOST_ID: 'scholar-rh-library-scholar-host',
    LIB_SCHOLAR_QUERY: 'scholar-rh-lib-inline-scholar-query',
    LIB_SCHOLAR_RUN: 'scholar-rh-lib-scholar-run',
    LIB_SCHOLAR_POPUP: 'scholar-rh-lib-scholar-popup',
    LIB_SCHOLAR_REF: 'scholar-rh-lib-ref-btn',
    LIB_SCHOLAR_FOLDER: 'scholar-rh-lib-folder-btn',
  };

  const SCHOLAR_RH_STYLE_LINK_ID = 'scholar-rh-top-menu-css';
  const SCHOLARREF_CSS_LINK_ID = 'scholar-rh-scholarref-css';
  const SCHOLAR_LAYOUT_CSS_LINK_ID = 'scholar-rh-scholarsearch-layout-css';
  const TOP_MENU_HTML_PATH = 'RightHeader/top-menu.html';
  const TOP_MENU_CSS_PATH = 'RightHeader/top-menu.css';

  let topMenuHtmlText = null;
  let topMenuHtmlPromise = null;
  /** @type {object | null} */
  let lastPromptsDeps = null;
  /** @type {MutationObserver | null} */
  let headerPersistenceObserver = null;
  let lastHeaderPersistMs = 0;

  function getExtensionUrl(path) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch (_) {}
    return null;
  }

  function loadTopMenuHtml() {
    if (topMenuHtmlPromise) return topMenuHtmlPromise;
    topMenuHtmlPromise = (async () => {
      const url = getExtensionUrl(TOP_MENU_HTML_PATH);
      if (!url) return null;
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) return null;
        topMenuHtmlText = await res.text();
        return topMenuHtmlText;
      } catch (_) {
        return null;
      }
    })();
    return topMenuHtmlPromise;
  }

  loadTopMenuHtml().then(() => {
    if (lastPromptsDeps) {
      tryInitPromptsButton(lastPromptsDeps);
    }
  });

  function ensureTopMenuStyles() {
    if (document.getElementById(SCHOLAR_RH_STYLE_LINK_ID)) return;
    const href = getExtensionUrl(TOP_MENU_CSS_PATH);
    if (!href) return;
    const link = document.createElement('link');
    link.id = SCHOLAR_RH_STYLE_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  function ensureScholarAuxStyles() {
    const hrefRef = getExtensionUrl('RightHeader/Scholarref/scholarref.css');
    const hrefLay = getExtensionUrl('RightHeader/Scholarref/scholarsearch-layout.css');
    if (hrefRef && !document.getElementById(SCHOLARREF_CSS_LINK_ID)) {
      const a = document.createElement('link');
      a.id = SCHOLARREF_CSS_LINK_ID;
      a.rel = 'stylesheet';
      a.href = hrefRef;
      (document.head || document.documentElement).appendChild(a);
    }
    if (hrefLay && !document.getElementById(SCHOLAR_LAYOUT_CSS_LINK_ID)) {
      const b = document.createElement('link');
      b.id = SCHOLAR_LAYOUT_CSS_LINK_ID;
      b.rel = 'stylesheet';
      b.href = hrefLay;
      (document.head || document.documentElement).appendChild(b);
    }
  }

  function toastScholar(msg) {
    try {
      if (typeof window.__scholarShowToast === 'function') {
        window.__scholarShowToast(msg);
      }
    } catch (_) {}
  }

  function openNotebookFolderManagerWindow() {
    try {
      if (window.ScholarNotebookFolderUI && typeof window.ScholarNotebookFolderUI.openFolderManagerWindow === 'function') {
        window.ScholarNotebookFolderUI.openFolderManagerWindow();
        return;
      }
    } catch (_) {}
    try {
      chrome.runtime.sendMessage({
        action: 'openWindow',
        url: 'folder/folder-manager.html',
        width: 1040,
        height: 760,
      });
    } catch (_) {}
  }

  /** ScholarSearchShell 초기화 전에도 헤더 검색이 동작하도록 (scholarsearch-shell.js 와 동일한 기본 파라미터) */
  function openGoogleScholarSearchTab(query) {
    const qv = String(query || '').trim();
    if (!qv) return false;
    try {
      const params = new URLSearchParams();
      params.set('q', qv);
      params.set('hl', 'ko');
      params.set('lr', 'lang_ko');
      params.set('as_vis', '1');
      const url = 'https://scholar.google.com/scholar?' + params.toString();
      const win = window.open(url, '_blank', 'noopener,noreferrer,width=1200,height=900');
      if (!win) toastScholar('팝업이 차단되었습니다. 이 사이트에서 팝업을 허용해 주세요.');
      return !!win;
    } catch (_) {
      return false;
    }
  }

  /**
   * @param {{ queryId: string, runId: string, popupId: string, refId: string }} spec
   * @param {ParentNode | null} [root] 호스트가 아직 document에 없을 때 하위에서만 조회
   */
  function wireScholarInlineControls(spec, root) {
    const scope = root && root.nodeType === 1 ? /** @type {Element} */ (root) : document;
    const q = (id) => scope.querySelector('#' + CSS.escape(id)) || document.getElementById(id);
    const inline = q(spec.queryId);
    const runBtn = q(spec.runId);
    const popupBtn = q(spec.popupId);
    const refBtn = q(spec.refId);
    if (!inline || !runBtn || !popupBtn || !refBtn) return;
    const row = inline.closest('.scholar-rh-scholar-row');
    if (row && row.getAttribute('data-scholar-wired') === '1') return;
    if (row) row.setAttribute('data-scholar-wired', '1');

    function runFromInput() {
      const qv = String(inline.value || '').trim();
      if (!qv) {
        toastScholar('검색어를 입력해 주세요.');
        return;
      }
      const shell = window.ScholarSearchShell;
      if (shell && typeof shell.openSearchWindow === 'function') {
        shell.openSearchWindow(qv, { lang: 'ko' });
      } else {
        openGoogleScholarSearchTab(qv);
      }
    }

    inline.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        runFromInput();
      }
    });
    runBtn.addEventListener('click', runFromInput);

    popupBtn.addEventListener('click', () => {
      const shell = window.ScholarSearchShell;
      if (!shell || typeof shell.openModal !== 'function') {
        toastScholar('Scholar 패널을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.');
        return;
      }
      shell.openModal();
      requestAnimationFrame(() => {
        const mq = document.getElementById('scholar-search-query');
        if (mq && inline) mq.value = String(inline.value || '');
      });
    });

    refBtn.addEventListener('click', () => {
      const shell = window.ScholarSearchShell;
      if (!shell || typeof shell.openModal !== 'function') {
        toastScholar('Scholar 패널을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.');
        return;
      }
      shell.openModal();
      requestAnimationFrame(() => {
        if (typeof window.toggleScholarRefPanel === 'function') {
          window.toggleScholarRefPanel();
        }
      });
    });
  }

  /** ScholarSearchShell.init 은 content.js runScholarNotebookLMInit 에서 호출 (토스트·편집기 훅 이후). */

  /**
   * @returns {Element | null}
   */
  function parseTopMenuHostFromHtml(html) {
    if (!html || !html.trim()) return null;
    const wrapped = '<div id="scholar-rh-parse-wrap">' + html + '</div>';
    try {
      const doc = new DOMParser().parseFromString(wrapped, 'text/html');
      const host = doc.getElementById(IDS.HOST_ID);
      return host ? document.importNode(host, true) : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * @returns {Element}
   */
  function buildTopMenuHostManually() {
    const host = document.createElement('div');
    host.id = IDS.HOST_ID;
    host.className = 'scholar-rh-top-menu';
    host.setAttribute('data-scholar-injected', 'right-header');
    host.setAttribute('aria-label', 'Scholar header tools');

    const row = document.createElement('div');
    row.className = 'scholar-rh-scholar-row';
    row.id = 'scholar-rh-scholar-row';
    const badge = document.createElement('span');
    badge.className = 'scholar-rh-scholar-badge';
    badge.textContent = 'G';
    badge.title = 'Google Scholar';
    const inp = document.createElement('input');
    inp.type = 'search';
    inp.id = IDS.SCHOLAR_INLINE_QUERY;
    inp.className = 'scholar-rh-inline-scholar-query';
    inp.placeholder = 'Google Scholar 검색…';
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('aria-label', 'Google Scholar 검색어');
    const runB = document.createElement('button');
    runB.type = 'button';
    runB.id = IDS.SCHOLAR_RUN_BTN;
    runB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    runB.textContent = '검색';
    runB.title = '입력한 키워드로 Google Scholar 검색 (새 탭)';
    const popB = document.createElement('button');
    popB.type = 'button';
    popB.id = IDS.SCHOLAR_POPUP_BTN;
    popB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    popB.textContent = '팝업';
    popB.title = '검색 옵션·인용관리 패널 열기';
    const refB = document.createElement('button');
    refB.type = 'button';
    refB.id = IDS.SCHOLAR_REF_BTN;
    refB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    refB.textContent = '인용';
    refB.title = '참고문헌·인용 관리 (패널에서 열기)';
    const folderB = document.createElement('button');
    folderB.type = 'button';
    folderB.id = IDS.SCHOLAR_FOLDER_BTN;
    folderB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    folderB.textContent = '폴더';
    folderB.title = '노트북 폴더 관리 창 열기';
    row.appendChild(badge);
    row.appendChild(inp);
    row.appendChild(runB);
    row.appendChild(popB);
    row.appendChild(refB);
    row.appendChild(folderB);
    host.appendChild(row);

    const geminiBtn = document.createElement('button');
    geminiBtn.type = 'button';
    geminiBtn.id = IDS.GEMINI_NOTEBOOK_BTN_ID;
    geminiBtn.className = 'scholar-rh-btn scholar-rh-btn--gemini';
    geminiBtn.textContent = 'Gemini';
    geminiBtn.title = 'Gemini 노트북 보기 (새 창)';

    const mdBtn = document.createElement('button');
    mdBtn.type = 'button';
    mdBtn.id = IDS.MD_EDITOR_HEADER_BTN_ID;
    mdBtn.className = 'scholar-rh-btn';
    mdBtn.textContent = 'MDEditor';
    mdBtn.title = 'Markdown Editor 열기';

    host.appendChild(geminiBtn);
    host.appendChild(mdBtn);
    return host;
  }

  function wireTopMenuButtons(host, deps) {
    const getConfiguredToMDUrl = deps && typeof deps.getConfiguredToMDUrl === 'function' ? deps.getConfiguredToMDUrl : null;
    const openConfiguredToMD = deps && typeof deps.openConfiguredToMD === 'function' ? deps.openConfiguredToMD : null;

    ensureScholarAuxStyles();
    const scholarRoot = host && host.id === IDS.HOST_ID ? host : document;
    wireScholarInlineControls(
      {
        queryId: IDS.SCHOLAR_INLINE_QUERY,
        runId: IDS.SCHOLAR_RUN_BTN,
        popupId: IDS.SCHOLAR_POPUP_BTN,
        refId: IDS.SCHOLAR_REF_BTN,
      },
      scholarRoot
    );

    const scopeEl = scholarRoot.id === IDS.HOST_ID ? scholarRoot : document;
    const btnGemini = scopeEl.querySelector('#' + CSS.escape(IDS.GEMINI_NOTEBOOK_BTN_ID)) || document.getElementById(IDS.GEMINI_NOTEBOOK_BTN_ID);
    const btnMd = scopeEl.querySelector('#' + CSS.escape(IDS.MD_EDITOR_HEADER_BTN_ID)) || document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID);

    if (btnGemini) {
      btnGemini.onclick = () => {
        const win = window.open(GEMINI_NOTEBOOK_VIEW_URL, '_blank', 'noopener,noreferrer,width=1200,height=900');
        if (!win) toastScholar('팝업이 차단되었습니다. 이 사이트에서 팝업을 허용해 주세요.');
      };
    }

    if (btnMd) {
      btnMd.onclick = async () => {
        if (!getConfiguredToMDUrl || !openConfiguredToMD) return;
        const url = await getConfiguredToMDUrl();
        openConfiguredToMD(url);
      };
    }

    const btnFolder =
      scopeEl.querySelector('#' + CSS.escape(IDS.SCHOLAR_FOLDER_BTN)) || document.getElementById(IDS.SCHOLAR_FOLDER_BTN);
    if (btnFolder) {
      btnFolder.onclick = () => openNotebookFolderManagerWindow();
    }
  }

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

  function isNotebookLmLibraryShell() {
    try {
      if (!/notebooklm\.google\.com$/i.test(location.hostname || '')) return false;
      if (document.querySelector('title-bar-settings')) return false;
      if (document.querySelector('.notebook-header-buttons-container')) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function findLibrarySearchAnchor() {
    const candidates = queryAllIncludingShadow(document.body, 'button, [role="button"]');
    for (const el of candidates) {
      const al = (el.getAttribute && el.getAttribute('aria-label')) || '';
      const low = String(al).toLowerCase();
      if (low.includes('search') || low.includes('검색')) return el;
    }
    return null;
  }

  function buildLibraryScholarHost() {
    const host = document.createElement('div');
    host.id = IDS.LIBRARY_HOST_ID;
    host.className = 'scholar-rh-top-menu';
    host.setAttribute('data-scholar-injected', 'library-scholar');
    host.setAttribute('aria-label', 'Scholar search tools');

    const row = document.createElement('div');
    row.className = 'scholar-rh-scholar-row';
    const badge = document.createElement('span');
    badge.className = 'scholar-rh-scholar-badge';
    badge.textContent = 'G';
    badge.title = 'Google Scholar';
    const inp = document.createElement('input');
    inp.type = 'search';
    inp.id = IDS.LIB_SCHOLAR_QUERY;
    inp.className = 'scholar-rh-inline-scholar-query';
    inp.placeholder = 'Google Scholar 검색…';
    inp.setAttribute('autocomplete', 'off');
    const runB = document.createElement('button');
    runB.type = 'button';
    runB.id = IDS.LIB_SCHOLAR_RUN;
    runB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    runB.textContent = '검색';
    const popB = document.createElement('button');
    popB.type = 'button';
    popB.id = IDS.LIB_SCHOLAR_POPUP;
    popB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    popB.textContent = '팝업';
    const refB = document.createElement('button');
    refB.type = 'button';
    refB.id = IDS.LIB_SCHOLAR_REF;
    refB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    refB.textContent = '인용';
    const folderB = document.createElement('button');
    folderB.type = 'button';
    folderB.id = IDS.LIB_SCHOLAR_FOLDER;
    folderB.className = 'scholar-rh-btn scholar-rh-btn--compact';
    folderB.textContent = '폴더';
    folderB.title = '노트북 폴더 관리 창 열기';
    row.appendChild(badge);
    row.appendChild(inp);
    row.appendChild(runB);
    row.appendChild(popB);
    row.appendChild(refB);
    row.appendChild(folderB);
    host.appendChild(row);
    return host;
  }

  function tryInitLibraryScholarToolbar() {
    if (!isNotebookLmLibraryShell()) return false;
    if (document.getElementById(IDS.LIBRARY_HOST_ID)) return true;
    const anchor = findLibrarySearchAnchor();
    if (!anchor?.parentElement) return false;
    ensureTopMenuStyles();
    ensureScholarAuxStyles();
    const host = buildLibraryScholarHost();
    anchor.parentElement.insertBefore(host, anchor);
    wireScholarInlineControls(
      {
        queryId: IDS.LIB_SCHOLAR_QUERY,
        runId: IDS.LIB_SCHOLAR_RUN,
        popupId: IDS.LIB_SCHOLAR_POPUP,
        refId: IDS.LIB_SCHOLAR_REF,
      },
      host
    );
    const libFolder = host.querySelector('#' + CSS.escape(IDS.LIB_SCHOLAR_FOLDER));
    if (libFolder) libFolder.onclick = () => openNotebookFolderManagerWindow();
    return true;
  }

  function tryInitLibraryScholarToolbarLoop() {
    if (tryInitLibraryScholarToolbar()) return;
    const obs = new MutationObserver(() => {
      if (tryInitLibraryScholarToolbar()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 30000);
  }

  /** NotebookLM SPA로 헤더 DOM이 바뀌어도 상단 메뉴·라이브러리 Scholar 바를 다시 붙임 */
  function startRightHeaderPersistence() {
    if (headerPersistenceObserver) return;
    headerPersistenceObserver = new MutationObserver(() => {
      const now = Date.now();
      if (now - lastHeaderPersistMs < 400) return;
      lastHeaderPersistMs = now;
      try {
        const settingsEl = document.querySelector('title-bar-settings');
        const container = document.querySelector('.notebook-header-buttons-container');
        const hasNotebookHeader = !!(settingsEl || container);
        if (lastPromptsDeps && hasNotebookHeader && !document.getElementById(IDS.HOST_ID)) {
          initPromptsButton(lastPromptsDeps);
        }
        if (isNotebookLmLibraryShell() && !document.getElementById(IDS.LIBRARY_HOST_ID)) {
          tryInitLibraryScholarToolbar();
        }
      } catch (_) {}
    });
    headerPersistenceObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopRightHeaderPersistence() {
    try {
      headerPersistenceObserver?.disconnect();
    } catch (_) {}
    headerPersistenceObserver = null;
  }

  function findCreateNotebookButton() {
    const keywords = ['노트북 만들기', '새로 만들기', '새 노트 만들기', 'Create Notebook', 'Create notebook'];
    const candidates = queryAllIncludingShadow(document.body, 'button, [role="button"], a');
    for (const el of candidates) {
      const text = (el.textContent || '').trim();
      if (keywords.some((k) => text.includes(k))) return el;
    }
    return null;
  }

  function tryPlaceMainButtonNextToCreateNotebook(btn, zTop) {
    if (!btn || !document.getElementById(IDS.BTN_ID)) return;
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
    btn.style.zIndex = zTop;
    return false;
  }

  function tryPlaceMainButtonLoop(btn, zTop) {
    if (findCreateNotebookButton()) return;
    const obs = new MutationObserver(() => {
      if (tryPlaceMainButtonNextToCreateNotebook(btn, zTop)) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      tryPlaceMainButtonNextToCreateNotebook(btn, zTop);
    }, 8000);
  }

  function repositionMDEditorHeaderButton(_mdBtnOrNull) {
    const host = document.getElementById(IDS.HOST_ID);
    if (host?.isConnected) {
      const settingsEl = document.querySelector('title-bar-settings');
      const container = document.querySelector('.notebook-header-buttons-container');
      if (settingsEl?.parentElement) {
        if (host.previousElementSibling !== settingsEl) {
          settingsEl.insertAdjacentElement('afterend', host);
        }
        return;
      }
      if (container) {
        if (!container.contains(host)) container.appendChild(host);
        return;
      }
      return;
    }

    const mdBtn = _mdBtnOrNull || document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID);
    if (!mdBtn) return;
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
    const el = mdBtn || document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID);
    if (!el) return;
    try {
      chrome.storage.local.get(IDS.STORAGE_HIDE_MD_EDITOR_HEADER, (r) => {
        if (chrome.runtime.lastError) return;
        const hidden = r[IDS.STORAGE_HIDE_MD_EDITOR_HEADER] !== false;
        setMDEditorHeaderButtonHidden(el, hidden);
      });
    } catch (_) {}
  }

  function registerHideMDEditorHeaderStorageListener() {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[IDS.STORAGE_HIDE_MD_EDITOR_HEADER]) return;
        const hidden = changes[IDS.STORAGE_HIDE_MD_EDITOR_HEADER].newValue !== false;
        const btn = document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID);
        setMDEditorHeaderButtonHidden(btn, hidden);
      });
    } catch (_) {}
  }

  function initPromptsButton(deps) {
    const getConfiguredToMDUrl = deps && typeof deps.getConfiguredToMDUrl === 'function' ? deps.getConfiguredToMDUrl : null;
    const openConfiguredToMD = deps && typeof deps.openConfiguredToMD === 'function' ? deps.openConfiguredToMD : null;
    const wirePayload = { getConfiguredToMDUrl, openConfiguredToMD };

    const existingHost = document.getElementById(IDS.HOST_ID);
    const existingMd = document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID);
    if (existingHost?.isConnected && existingMd?.isConnected) {
      ensureTopMenuStyles();
      ensureScholarAuxStyles();
      wireTopMenuButtons(existingHost, wirePayload);
      repositionMDEditorHeaderButton(existingMd);
      syncMDEditorHeaderButtonVisibility(existingMd);
      return true;
    }
    if (!existingHost && existingMd?.isConnected) {
      ensureTopMenuStyles();
      ensureScholarAuxStyles();
      wireTopMenuButtons(document.body, wirePayload);
      repositionMDEditorHeaderButton(existingMd);
      syncMDEditorHeaderButtonVisibility(existingMd);
      return true;
    }

    const settingsEl = document.querySelector('title-bar-settings');
    const container = document.querySelector('.notebook-header-buttons-container');
    const target = settingsEl || container;
    if (!target) return false;

    ensureTopMenuStyles();
    ensureScholarAuxStyles();

    let host = null;
    if (topMenuHtmlText) {
      host = parseTopMenuHostFromHtml(topMenuHtmlText);
    }
    if (!host) {
      host = buildTopMenuHostManually();
    }

    if (settingsEl) {
      settingsEl.insertAdjacentElement('afterend', host);
    } else if (container) {
      container.appendChild(host);
    }

    wireTopMenuButtons(host, wirePayload);

    const mdBtn = document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID);
    repositionMDEditorHeaderButton(mdBtn);
    syncMDEditorHeaderButtonVisibility(mdBtn);
    return true;
  }

  function tryInitPromptsButton(deps) {
    lastPromptsDeps = deps;
    startRightHeaderPersistence();
    if (initPromptsButton(deps)) return;
    const obs = new MutationObserver(() => {
      if (initPromptsButton(deps)) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 25000);
  }

  function removeHeaderInjections() {
    stopRightHeaderPersistence();
    try {
      document.getElementById(SCHOLAR_RH_STYLE_LINK_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById(SCHOLARREF_CSS_LINK_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById(SCHOLAR_LAYOUT_CSS_LINK_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById('scholar-search-modal')?.remove();
    } catch (_) {}
    try {
      document.getElementById(IDS.LIBRARY_HOST_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById(IDS.HOST_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById(IDS.PROMPTS_HEADER_BTN_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById(IDS.GEMINI_NOTEBOOK_BTN_ID)?.remove();
    } catch (_) {}
    try {
      document.getElementById(IDS.MD_EDITOR_HEADER_BTN_ID)?.remove();
    } catch (_) {}
  }

  window.ScholarRightHeader = {
    IDS,
    findCreateNotebookButton,
    tryPlaceMainButtonNextToCreateNotebook,
    tryPlaceMainButtonLoop,
    repositionMDEditorHeaderButton,
    setMDEditorHeaderButtonHidden,
    syncMDEditorHeaderButtonVisibility,
    registerHideMDEditorHeaderStorageListener,
    initPromptsButton,
    tryInitPromptsButton,
    tryInitLibraryScholarToolbar,
    tryInitLibraryScholarToolbarLoop,
    startRightHeaderPersistence,
    stopRightHeaderPersistence,
    removeHeaderInjections,
  };
})();
