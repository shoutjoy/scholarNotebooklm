/* Scholar Assistant - Kortex Integration Controls */
(function () {
  'use strict';

  const KORTEX_PROMPT_BLOCK_STYLE_ID = 'scholar-kortex-prompt-block-style';
  const KORTEX_STUDIO_PDF2PPT_MARKER = 'data-scholar-kortex-pdf2ppt';
  const KORTEX_HIDE_SELECTOR = '#kortex-prompt-holder-btn, [id^="kortex-prompt-holder-btn"], [id*="kortex-prompt-holder-btn"]';

  let kortexPromptObserver = null;
  let kortexSyncTimer = null;

  function applyKortexActionButtonStyle(el) {
    if (!el?.style) return;
    el.style.setProperty('margin-left', '8px', 'important');
    el.style.setProperty('padding', '6px 10px', 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('border-radius', '8px', 'important');
    el.style.setProperty('background', '#0f766e', 'important');
    el.style.setProperty('color', '#ecfeff', 'important');
    el.style.setProperty('font-size', '12px', 'important');
    el.style.setProperty('font-weight', '700', 'important');
    el.style.setProperty('cursor', 'pointer', 'important');
    el.style.setProperty('line-height', '1', 'important');
    el.style.setProperty('display', 'inline-flex', 'important');
    el.style.setProperty('align-items', 'center', 'important');
    el.style.setProperty('justify-content', 'center', 'important');
    el.style.setProperty('white-space', 'nowrap', 'important');
  }

  function setButtonLabel(el, label) {
    if (!el) return;
    el.textContent = label;
    el.setAttribute('aria-label', label);
    el.title = label;
  }

  function ensureKortexPromptBlockStyle() {
    let styleEl = document.getElementById(KORTEX_PROMPT_BLOCK_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = KORTEX_PROMPT_BLOCK_STYLE_ID;
      document.documentElement.appendChild(styleEl);
    }
    styleEl.textContent = `
      #kortex-prompt-holder-btn,
      #kortex-prompt-holder-btn *,
      [id^="kortex-prompt-holder-btn"],
      [id^="kortex-prompt-holder-btn"] *,
      [id*="kortex-prompt-holder-btn"],
      [id*="kortex-prompt-holder-btn"] * {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
  }

  function hideKortexPromptNodes(root) {
    if (!root || root.nodeType !== 1) return;
    const targets = [];
    if (root.matches?.(KORTEX_HIDE_SELECTOR)) {
      targets.push(root);
    }
    try {
      root.querySelectorAll?.(KORTEX_HIDE_SELECTOR).forEach((el) => targets.push(el));
    } catch (_) {}
    targets.forEach((el) => {
      try {
        el.setAttribute('aria-hidden', 'true');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      } catch (_) {}
    });
  }

  function hideKortexPromptActionButtons() {
    const rows = document.querySelectorAll('#kortex-studio-actions-wrapper > div');
    rows.forEach((row) => {
      row.querySelectorAll('button').forEach((btn) => {
        if (btn.id === 'kortex-studio-export-button') return;
        if (btn.getAttribute(KORTEX_STUDIO_PDF2PPT_MARKER) === '1') return;
        const label = ((btn.innerText || btn.textContent || '') + ' ' + (btn.getAttribute('aria-label') || '')).toLowerCase();
        if (label.includes('prompt')) {
          btn.setAttribute('aria-hidden', 'true');
          btn.style.setProperty('display', 'none', 'important');
          btn.style.setProperty('visibility', 'hidden', 'important');
          btn.style.setProperty('pointer-events', 'none', 'important');
        }
      });
    });
  }

  function isVisibleElement(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0;
  }

  function hasVisibleNativeStudioTilesForKortex() {
    const panel = document.querySelector('section.studio-panel, [class*="studio-panel"], [class*="StudioPanel"]');
    if (!panel) return false;
    const keywords = [
      'AI 오디오', '슬라이드 자료', '마인드맵', '보고서', '플래시카드', '퀴즈', '인포그래픽', '데이터 표', '동영상 개요',
      'AI Audio', 'Slide', 'Mind Map', 'Report', 'Flashcard', 'Quiz', 'Infographic', 'Data Table', 'Video Overview'
    ];
    const nodes = panel.querySelectorAll('button, [role="button"], a[role="button"], [class*="tile"], [class*="card"], [class*="Tile"], [class*="Card"]');
    let hit = 0;
    for (const n of nodes) {
      if (n.id === 'kortex-studio-export-button') continue;
      if (n.getAttribute?.(KORTEX_STUDIO_PDF2PPT_MARKER) === '1') continue;
      if (!isVisibleElement(n)) continue;
      const text = (n.textContent || '').trim();
      if (!text) continue;
      if (keywords.some((k) => text.includes(k))) {
        hit += 1;
        if (hit >= 2) return true;
      }
    }
    return false;
  }

  function syncKortexActionsWrapperVisibility() {
    const wrapper = document.querySelector('#kortex-studio-actions-wrapper');
    if (!wrapper) return;
    const show = hasVisibleNativeStudioTilesForKortex();
    if (!show) {
      wrapper.style.setProperty('display', 'none', 'important');
      wrapper.style.setProperty('visibility', 'hidden', 'important');
      wrapper.style.setProperty('pointer-events', 'none', 'important');
    } else {
      wrapper.style.removeProperty('display');
      wrapper.style.removeProperty('visibility');
      wrapper.style.removeProperty('pointer-events');
    }
  }

  function ensureKortexPdf2PptButton() {
    syncKortexActionsWrapperVisibility();
    if (!hasVisibleNativeStudioTilesForKortex()) return;
    const actionRows = document.querySelectorAll('#kortex-studio-actions-wrapper > div');
    if (!actionRows?.length) return;

    actionRows.forEach((row) => {
      row.querySelectorAll('[' + KORTEX_STUDIO_PDF2PPT_MARKER + '="1"]').forEach((legacyBtn) => legacyBtn.remove());
      const exportBtn = row.querySelector('#kortex-studio-export-button');
      if (exportBtn) {
        setButtonLabel(exportBtn, 'All down');
        applyKortexActionButtonStyle(exportBtn);
      }
    });
  }
  function ensureKortexChatButtonsStyle() {
    const exportChatBtn = document.querySelector('#kortex-export-chat-button');
    if (exportChatBtn) {
      setButtonLabel(exportChatBtn, '대화저장');
      applyKortexActionButtonStyle(exportChatBtn);
    }
  }

  function isKortexRelevantNode(node) {
    if (!node || node.nodeType !== 1) return false;
    const el = node;
    if ((el.id || '').toLowerCase().includes('kortex')) return true;
    if (el.matches?.('#kortex-studio-actions-wrapper')) return true;
    try {
      return !!el.querySelector?.('#kortex-studio-actions-wrapper, [id*="kortex"]');
    } catch (_) {
      return false;
    }
  }

  function scheduleKortexSync() {
    if (kortexSyncTimer) return;
    kortexSyncTimer = window.setTimeout(() => {
      kortexSyncTimer = null;
      ensureKortexPromptBlockStyle();
      hideKortexPromptActionButtons();
      ensureKortexPdf2PptButton();
      ensureKortexChatButtonsStyle();
    }, 120);
  }

  function ensureKortexPromptSuppressed() {
    ensureKortexPromptBlockStyle();
    hideKortexPromptNodes(document.body);
    hideKortexPromptActionButtons();
    syncKortexActionsWrapperVisibility();
    ensureKortexPdf2PptButton();
    ensureKortexChatButtonsStyle();
  }

  function ensureKortexPromptObserver() {
    if (kortexPromptObserver) return;
    kortexPromptObserver = new MutationObserver((mutations) => {
      let relevant = false;
      for (const m of mutations) {
        m.addedNodes?.forEach((n) => {
          if (!isKortexRelevantNode(n)) return;
          relevant = true;
          hideKortexPromptNodes(n);
        });
      }
      if (relevant) scheduleKortexSync();
    });
    kortexPromptObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    ensureKortexPromptSuppressed();
    ensureKortexPromptObserver();
  }

  function teardown() {
    try {
      document.querySelectorAll('[data-scholar-studio-prompts="1"]').forEach((el) => el.remove());
    } catch (_) {}
    try {
      document.querySelectorAll('[' + KORTEX_STUDIO_PDF2PPT_MARKER + '="1"]').forEach((el) => el.remove());
    } catch (_) {}
    try { document.getElementById(KORTEX_PROMPT_BLOCK_STYLE_ID)?.remove(); } catch (_) {}
    try { kortexPromptObserver?.disconnect(); } catch (_) {}
    if (kortexSyncTimer) {
      window.clearTimeout(kortexSyncTimer);
      kortexSyncTimer = null;
    }
    kortexPromptObserver = null;
  }

  window.ScholarKortex = {
    init,
    teardown,
  };
})();
