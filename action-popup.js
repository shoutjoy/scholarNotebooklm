(function () {
  'use strict';

  const KEYS = {
    generalPrompt: 'scholarFeatureGeneralPrompt',
    notebookLM: 'scholarFeatureNotebookLM',
    geminiNotebook: 'scholarFeatureGeminiNotebook',
    mdEditor: 'scholarFeatureMDEditor',
    pdf2pptMake: 'scholarFeaturePdf2pptMake'
  };

  const MD_PROVIEWER_URL = 'https://mdproviewer.vercel.app/';
  const PDF2PPT_MAKE_URL = 'https://pdf2pptmake.onrender.com/';
  const GEMINI_NOTEBOOK_VIEW_URL = 'https://gemini.google.com/notebooks/view';
  const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
  const NOTEBOOKLM_HOST = 'notebooklm.google.com';

  const chkGen = document.getElementById('chkGeneralPrompt');
  const chkNb = document.getElementById('chkScholarNotebookLM');
  const chkGemini = document.getElementById('chkGeminiNotebook');
  const chkMd = document.getElementById('chkMDEditor');
  const chkPdf2ppt = document.getElementById('chkPdf2pptMake');

  const btnPrompts = document.getElementById('btnOpenPrompts');
  const btnSidebar = document.getElementById('btnToggleSidebar');
  const btnMd = document.getElementById('btnOpenMD');
  const btnPdf2ppt = document.getElementById('btnOpenPdf2pptMake');
  const btnGeminiNotebook = document.getElementById('btnOpenGeminiNotebook');
  const btnScholarPanel = document.getElementById('btnScholarPanel');
  const btnScholarRefPopup = document.getElementById('btnScholarRefPopup');
  const btnScholarFolderManager = document.getElementById('btnScholarFolderManager');
  const inpScholarQuery = document.getElementById('inpActionPopupScholarQuery');
  const btnScholarSearch = document.getElementById('btnActionPopupScholarSearch');

  const FOLDER_MANAGER_URL = 'folder/folder-manager.html';
  const FOLDER_MANAGER_WIN = { width: 1040, height: 760 };

  function tabMessagePayload(actionOrObject) {
    return typeof actionOrObject === 'string' ? { action: actionOrObject } : actionOrObject;
  }

  function openGeminiNotebookWindow() {
    chrome.windows.create({
      url: GEMINI_NOTEBOOK_VIEW_URL,
      type: 'popup',
      width: 1200,
      height: 900,
      focused: true
    }).catch(() => {
      chrome.tabs.create({ url: GEMINI_NOTEBOOK_VIEW_URL });
    });
  }

  function updateButtons() {
    btnPrompts.disabled = !chkGen.checked;
    btnSidebar.disabled = !chkNb.checked;
    btnMd.disabled = !chkMd.checked;
    btnPdf2ppt.disabled = !chkPdf2ppt.checked;
    const geminiOn = chkGemini && chkGemini.checked !== false;
    if (btnGeminiNotebook) btnGeminiNotebook.disabled = !geminiOn;
    if (btnScholarPanel) btnScholarPanel.disabled = !chkNb.checked;
    if (btnScholarRefPopup) btnScholarRefPopup.disabled = !chkNb.checked;
    if (btnScholarFolderManager) btnScholarFolderManager.disabled = !chkNb.checked;
    if (inpScholarQuery) inpScholarQuery.disabled = !chkNb.checked;
    if (btnScholarSearch) btnScholarSearch.disabled = !chkNb.checked;
  }

  function load() {
    chrome.storage.local.get(Object.values(KEYS), (data) => {
      if (chrome.runtime.lastError) return;
      chkGen.checked = data[KEYS.generalPrompt] !== false;
      chkNb.checked = data[KEYS.notebookLM] !== false;
      if (chkGemini) chkGemini.checked = data[KEYS.geminiNotebook] !== false;
      chkMd.checked = data[KEYS.mdEditor] !== false;
      chkPdf2ppt.checked = data[KEYS.pdf2pptMake] !== false;
      updateButtons();
    });
  }

  function save(key, checked) {
    chrome.storage.local.set({ [key]: checked });
  }

  function toggleSidebarWhenReady(tabId, maxAttempts = 20) {
    let attempts = 0;

    const trySend = () => {
      attempts += 1;
      chrome.tabs.sendMessage(tabId, { action: 'toggleSidebar' }, () => {
        if (!chrome.runtime.lastError) return;
        if (attempts >= maxAttempts) return;
        window.setTimeout(trySend, 400);
      });
    };

    trySend();
  }

  function openNotebookLmAndToggleSidebar() {
    chrome.tabs.create({ url: NOTEBOOKLM_URL }, (tab) => {
      if (!tab?.id) return;
      toggleSidebarWhenReady(tab.id);
    });
  }

  function sendNotebookLmCommandWhenReady(tabId, actionOrPayload, maxAttempts = 35) {
    const payload = tabMessagePayload(actionOrPayload);
    let attempts = 0;
    const trySend = () => {
      attempts += 1;
      chrome.tabs.sendMessage(tabId, payload, () => {
        if (!chrome.runtime.lastError) return;
        if (attempts >= maxAttempts) return;
        window.setTimeout(trySend, 400);
      });
    };
    window.setTimeout(trySend, 500);
  }

  function openNotebookLmAndSendAction(actionOrPayload) {
    chrome.tabs.create({ url: NOTEBOOKLM_URL }, (tab) => {
      if (!tab?.id) return;
      sendNotebookLmCommandWhenReady(tab.id, actionOrPayload);
    });
  }

  /** NotebookLM 탭이 있으면 스냅샷 갱신 후 폴더 관리 확장 창을 연다. */
  function openFolderManagerFromActionPopup() {
    if (!chkNb.checked) return;
    const openWin = () => {
      chrome.runtime.sendMessage(
        { action: 'openWindow', url: FOLDER_MANAGER_URL, width: FOLDER_MANAGER_WIN.width, height: FOLDER_MANAGER_WIN.height },
        (res) => {
          if (chrome.runtime.lastError || !res?.ok) {
            const url = chrome.runtime.getURL(FOLDER_MANAGER_URL);
            chrome.windows
              .create({ url, type: 'popup', width: FOLDER_MANAGER_WIN.width, height: FOLDER_MANAGER_WIN.height, focused: true })
              .catch(() => {});
          }
        }
      );
    };
    chrome.tabs.query({ url: 'https://notebooklm.google.com/*' }, (tabs) => {
      if (!tabs?.length) {
        openWin();
        return;
      }
      const listish = tabs.filter((t) => {
        try {
          const u = t?.url || '';
          if (!u) return false;
          return !/\/notebook\/[^/]+/.test(new URL(u).pathname || '');
        } catch {
          return true;
        }
      });
      const toPing = listish.length ? listish : tabs;
      let pending = 0;
      toPing.forEach((t) => {
        if (t.id) pending++;
      });
      if (!pending) {
        openWin();
        return;
      }
      let left = pending;
      toPing.forEach((t) => {
        if (!t.id) return;
        chrome.tabs.sendMessage(t.id, { action: 'scholarFolderRescanSnapshot' }, () => {
          void chrome.runtime.lastError;
          left--;
          if (left <= 0) window.setTimeout(openWin, 350);
        });
      });
    });
  }

  function sendScholarCommandToActiveTab(actionOrPayload) {
    const payload = tabMessagePayload(actionOrPayload);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url?.includes(NOTEBOOKLM_HOST)) {
        openNotebookLmAndSendAction(actionOrPayload);
        return;
      }
      let attempts = 0;
      const trySend = () => {
        attempts += 1;
        chrome.tabs.sendMessage(tab.id, payload, () => {
          if (!chrome.runtime.lastError) return;
          if (attempts >= 35) return;
          window.setTimeout(trySend, 400);
        });
      };
      trySend();
    });
  }

  function runScholarSearchFromActionPopup() {
    if (!chkNb.checked) return;
    const q = String(inpScholarQuery?.value || '').trim();
    if (!q) return;
    sendScholarCommandToActiveTab({ action: 'runScholarSearchFromPopup', query: q });
  }

  chkGen.addEventListener('change', () => {
    save(KEYS.generalPrompt, chkGen.checked);
    updateButtons();
  });

  chkNb.addEventListener('change', () => {
    save(KEYS.notebookLM, chkNb.checked);
    updateButtons();
  });

  if (chkGemini) {
    chkGemini.addEventListener('change', () => {
      save(KEYS.geminiNotebook, chkGemini.checked);
      updateButtons();
    });
  }

  chkMd.addEventListener('change', () => {
    save(KEYS.mdEditor, chkMd.checked);
    updateButtons();
  });

  chkPdf2ppt.addEventListener('change', () => {
    save(KEYS.pdf2pptMake, chkPdf2ppt.checked);
    updateButtons();
  });

  btnPrompts.addEventListener('click', () => {
    if (!chkGen.checked) return;
    chrome.runtime.sendMessage({ action: 'openPromptsWindow' }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        const url = chrome.runtime.getURL('prompts/prompts.html');
        chrome.windows.create({ url, type: 'popup', width: 900, height: 750 }).catch(() => {});
      }
    });
  });

  btnSidebar.addEventListener('click', () => {
    if (!chkNb.checked) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      if (!tab?.id || !tab.url?.includes(NOTEBOOKLM_HOST)) {
        openNotebookLmAndToggleSidebar();
        return;
      }

      toggleSidebarWhenReady(tab.id);
    });
  });

  btnMd.addEventListener('click', () => {
    if (!chkMd.checked) return;
    chrome.tabs.create({ url: MD_PROVIEWER_URL });
  });

  btnPdf2ppt.addEventListener('click', () => {
    if (!chkPdf2ppt.checked) return;
    chrome.tabs.create({ url: PDF2PPT_MAKE_URL });
  });

  if (btnGeminiNotebook) {
    btnGeminiNotebook.addEventListener('click', () => {
      if (!chkGemini?.checked) return;
      openGeminiNotebookWindow();
    });
  }

  if (btnScholarPanel) {
    btnScholarPanel.addEventListener('click', () => {
      if (!chkNb.checked) return;
      sendScholarCommandToActiveTab('openScholarSearchModal');
    });
  }

  if (btnScholarRefPopup) {
    btnScholarRefPopup.addEventListener('click', () => {
      if (!chkNb.checked) return;
      sendScholarCommandToActiveTab('openScholarRefPanelFromPopup');
    });
  }

  if (btnScholarFolderManager) {
    btnScholarFolderManager.addEventListener('click', () => {
      if (!chkNb.checked) return;
      openFolderManagerFromActionPopup();
    });
  }

  if (btnScholarSearch && inpScholarQuery) {
    btnScholarSearch.addEventListener('click', runScholarSearchFromActionPopup);
    inpScholarQuery.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        runScholarSearchFromActionPopup();
      }
    });
  }

  load();
})();
