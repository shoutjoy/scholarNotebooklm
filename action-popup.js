(function () {
  'use strict';

  const KEYS = {
    generalPrompt: 'scholarFeatureGeneralPrompt',
    notebookLM: 'scholarFeatureNotebookLM',
    mdEditor: 'scholarFeatureMDEditor',
    pdf2pptMake: 'scholarFeaturePdf2pptMake'
  };

  const MD_PROVIEWER_URL = 'https://mdproviewer.vercel.app/';
  const PDF2PPT_MAKE_URL = 'https://pdf2pptmake.onrender.com/';
  const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
  const NOTEBOOKLM_HOST = 'notebooklm.google.com';

  const chkGen = document.getElementById('chkGeneralPrompt');
  const chkNb = document.getElementById('chkScholarNotebookLM');
  const chkMd = document.getElementById('chkMDEditor');
  const chkPdf2ppt = document.getElementById('chkPdf2pptMake');

  const btnPrompts = document.getElementById('btnOpenPrompts');
  const btnSidebar = document.getElementById('btnToggleSidebar');
  const btnMd = document.getElementById('btnOpenMD');
  const btnPdf2ppt = document.getElementById('btnOpenPdf2pptMake');

  function updateButtons() {
    btnPrompts.disabled = !chkGen.checked;
    btnSidebar.disabled = !chkNb.checked;
    btnMd.disabled = !chkMd.checked;
    btnPdf2ppt.disabled = !chkPdf2ppt.checked;
  }

  function load() {
    chrome.storage.local.get(Object.values(KEYS), (data) => {
      if (chrome.runtime.lastError) return;
      chkGen.checked = data[KEYS.generalPrompt] !== false;
      chkNb.checked = data[KEYS.notebookLM] !== false;
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

  chkGen.addEventListener('change', () => {
    save(KEYS.generalPrompt, chkGen.checked);
    updateButtons();
  });

  chkNb.addEventListener('change', () => {
    save(KEYS.notebookLM, chkNb.checked);
    updateButtons();
  });

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

  load();
})();
