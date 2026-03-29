(function () {
  async function loadSettingsModal() {
    const slot = document.getElementById('settings-modal-slot');
    if (!slot || document.getElementById('settings-modal')) return;

    const url = typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('popup_setting/popup-settings.html')
      : 'popup_setting/popup-settings.html';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`settings modal load failed: ${response.status}`);
    }

    slot.innerHTML = await response.text();
  }

  async function saveSettings() {
    const type = document.querySelector('input[name="tomdOpenType"]:checked')?.value || 'external';
    const scrapResponseFormat = document.querySelector('input[name="scrapResponseFormat"]:checked')?.value || 'answer_only';
    const hideConversationSave = document.getElementById('chkHideConversationSave')?.checked === true;
    const hideMDEditorHeader = document.getElementById('chkHideMDEditorHeader')?.checked === true;
    const hideScholarSlideStudio = document.getElementById('chkHideScholarSlideStudio')?.checked === true;
    const hideMDProViewerStudio = document.getElementById('chkHideMDProViewerStudio')?.checked === true;
    const storage = typeof window.getStorage === 'function' ? window.getStorage() : null;

    if (storage) {
      await storage.set({
        [window.STORAGE_KEYS.tomdOpenType]: type,
        [window.STORAGE_KEYS.scrapResponseFormat]: scrapResponseFormat,
        [window.STORAGE_KEYS.hideConversationSave]: hideConversationSave,
        [window.STORAGE_KEYS.hideMDEditorHeader]: hideMDEditorHeader,
        [window.STORAGE_KEYS.hideScholarSlideStudio]: hideScholarSlideStudio,
        [window.STORAGE_KEYS.hideMDProViewerStudio]: hideMDProViewerStudio,
      });
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime?.lastError) return;
          const tab = Array.isArray(tabs) ? tabs[0] : null;
          if (!tab?.id || !tab.url?.includes('notebooklm.google.com')) return;
          chrome.tabs.sendMessage(tab.id, {
            action: 'refreshNotebookUiPreferences',
            hideConversationSave,
            hideMDEditorHeader,
            hideScholarSlideStudio,
            hideMDProViewerStudio,
          }, () => {
            void chrome.runtime?.lastError;
          });
        });
      }
    } catch (_) {}

    if (typeof window.applyConversationSaveVisibility === 'function') {
      window.applyConversationSaveVisibility(hideConversationSave);
    }
    if (typeof window.closeModal === 'function') {
      window.closeModal('settings-modal');
    }
    if (typeof window.showMessage === 'function') {
      window.showMessage('설정이 저장되었습니다.');
    }
  }

  window.PopupSettings = {
    loadSettingsModal,
    saveSettings,
  };
})();
