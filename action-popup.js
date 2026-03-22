(function () {
  'use strict';

  const KEYS = {
    generalPrompt: 'scholarFeatureGeneralPrompt',
    notebookLM: 'scholarFeatureNotebookLM',
    mdEditor: 'scholarFeatureMDEditor'
  };
  const MD_PROVIEWER_URL = 'https://mdproviewer.vercel.app/';

  const chkGen = document.getElementById('chkGeneralPrompt');
  const chkNb = document.getElementById('chkScholarNotebookLM');
  const chkMd = document.getElementById('chkMDEditor');
  const btnPrompts = document.getElementById('btnOpenPrompts');
  const btnSidebar = document.getElementById('btnToggleSidebar');
  const btnMd = document.getElementById('btnOpenMD');

  function updateButtons() {
    btnPrompts.disabled = !chkGen.checked;
    btnSidebar.disabled = !chkNb.checked;
    btnMd.disabled = !chkMd.checked;
  }

  function load() {
    chrome.storage.local.get(Object.values(KEYS), (data) => {
      if (chrome.runtime.lastError) return;
      chkGen.checked = data[KEYS.generalPrompt] !== false;
      chkNb.checked = data[KEYS.notebookLM] !== false;
      chkMd.checked = data[KEYS.mdEditor] !== false;
      updateButtons();
    });
  }

  function save(key, checked) {
    chrome.storage.local.set({ [key]: checked });
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
      if (!tab?.id || !tab.url?.includes('notebooklm.google.com')) {
        window.alert('NotebookLM 탭을 연 뒤 사용하세요.');
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, () => {
        void chrome.runtime.lastError;
      });
    });
  });

  btnMd.addEventListener('click', () => {
    if (!chkMd.checked) return;
    chrome.tabs.create({ url: MD_PROVIEWER_URL });
  });

  load();
})();
