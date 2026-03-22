/**
 * Scholar Assistant - NotebookLM Extension
 * NotebookLM: 아이콘/버튼 클릭 시 페이지 내 우측 사이드바만 사용 (별도 창 없음)
 * 기타 사이트: 팝업 창 열기
 */
const NOTEBOOKLM_HOST = 'notebooklm.google.com';
const POPUP_WIDTH = 650;
const POPUP_HEIGHT = 450;

function isManagedExtensionUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const base = chrome.runtime.getURL('');
  return url.startsWith(base) && (
    url.includes('popup.html') ||
    url.includes('prompts/prompts.html') ||
    url.includes('vieweditor/')
  );
}

async function closeManagedExtensionWindows() {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    const managedTabs = (win.tabs || []).filter((tab) => isManagedExtensionUrl(tab.url));
    if (!managedTabs.length) continue;

    const nonManagedTabs = (win.tabs || []).filter((tab) => !isManagedExtensionUrl(tab.url));
    if (!nonManagedTabs.length) {
      await chrome.windows.remove(win.id).catch(() => {});
      continue;
    }

    for (const tab of managedTabs) {
      if (tab.id != null) {
        await chrome.tabs.remove(tab.id).catch(() => {});
      }
    }
  }
}

async function focusOrCreateWindowByUrl(targetUrl, options = {}) {
  const width = Math.floor(Number(options.width) || 1200);
  const height = Math.floor(Number(options.height) || 850);
  const isInternalView = typeof targetUrl === 'string' && targetUrl.includes('vieweditor/index.html');
  const windows = await chrome.windows.getAll({ populate: true });

  for (const win of windows) {
    for (const tab of win.tabs || []) {
      if (!tab?.url) continue;
      const sameTarget = isInternalView ? tab.url.includes('vieweditor/index.html') : tab.url === targetUrl;
      if (!sameTarget) continue;

      await chrome.windows.update(win.id, { focused: true, state: 'normal' }).catch(() => {});
      if (tab.id != null) {
        await chrome.tabs.update(tab.id, { active: true, url: targetUrl }).catch(() => {});
      }
      return { reused: true, windowId: win.id, tabId: tab.id || null };
    }
  }

  const created = await chrome.windows.create({
    url: targetUrl,
    type: 'popup',
    width,
    height
  });

  return {
    reused: false,
    windowId: created?.id || null,
    tabId: created?.tabs?.[0]?.id || null
  };
}

function openPopupWindow(position) {
  let left = 20;
  let top = 440;
  if (position && typeof position.left === 'number' && typeof position.top === 'number') {
    left = Math.floor(Math.max(0, position.left));
    top = Math.floor(Math.max(0, position.top));
  }
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    left,
    top
  });
}

function ensureFeatureDefaults() {
  chrome.storage.local.get(
    ['scholarFeatureGeneralPrompt', 'scholarFeatureNotebookLM', 'scholarFeatureMDEditor', 'hideMDEditorHeader'],
    (d) => {
      if (chrome.runtime.lastError) return;
      const patch = {};
      if (d.scholarFeatureGeneralPrompt === undefined) patch.scholarFeatureGeneralPrompt = true;
      if (d.scholarFeatureNotebookLM === undefined) patch.scholarFeatureNotebookLM = true;
      if (d.scholarFeatureMDEditor === undefined) patch.scholarFeatureMDEditor = true;
      if (d.hideMDEditorHeader === undefined) patch.hideMDEditorHeader = true;
      if (Object.keys(patch).length) chrome.storage.local.set(patch);
    }
  );
}

chrome.runtime.onInstalled.addListener(() => {
  closeManagedExtensionWindows().catch(() => {});
  ensureFeatureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  closeManagedExtensionWindows().catch(() => {});
  ensureFeatureDefaults();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    if (sender.tab?.url?.includes(NOTEBOOKLM_HOST)) {
      chrome.tabs.sendMessage(sender.tab.id, { action: 'toggleSidebar' }).catch(() => {});
    }
    sendResponse({ ok: true });
  } else if (message.action === 'openWindow') {
    const { url, width = 800, height = 600 } = message;
    if (url) {
      focusOrCreateWindowByUrl(chrome.runtime.getURL(url), {
        width: Math.floor(Number(width) || 800),
        height: Math.floor(Number(height) || 600)
      }).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, err: String(e) }));
    } else sendResponse({ ok: false, err: 'url required' });
    return true;
  } else if (message.action === 'openPromptsWindow') {
    focusOrCreateWindowByUrl(chrome.runtime.getURL('prompts/prompts.html'), {
      width: 900,
      height: 750
    }).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, err: String(e) }));
    return true;
  } else if (message.action === 'closeNotebookLmSatelliteWindows') {
    closeManagedExtensionWindows().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, err: String(e) }));
    return true;
  } else if (message.action === 'notebookExited') {
    closeManagedExtensionWindows().catch(() => {});
    chrome.runtime.sendMessage({ action: 'clearOnNotebookExit' }).catch(() => {});
    sendResponse({ ok: true });
  } else if (message.action === 'openToMD') {
    const targetUrl = message.url || 'https://mdproviewer.vercel.app/';
    if (targetUrl.includes('vieweditor/index.html')) {
      focusOrCreateWindowByUrl(targetUrl, { width: 1200, height: 850 }).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, err: String(e) }));
    } else {
      chrome.tabs.create({ url: targetUrl }).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, err: String(e) }));
    }
    return true;
  } else if (message.action === 'openExternalPaste' && message.url) {
    if (message.url.includes('vieweditor/index.html')) {
      focusOrCreateWindowByUrl(message.url, { width: 1200, height: 850 }).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, err: String(e) }));
    } else {
      chrome.tabs.create({ url: message.url }).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, err: String(e) }));
    }
    return true;
  }
  return true;
});
