/**
 * Scholar Assistant - NotebookLM Extension
 * Content script for https://scholarslide.vercel.app/*
 * storage에 저장된 내용을 #text-paste-input에 자동 붙여넣기
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'scholarScholarSlidePaste';

  function tryInject(text) {
    if (!text || typeof text !== 'string') return false;

    const inject = (el) => {
      if (!el || el.offsetParent === null) return false;
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const selectors = [
      '#text-paste-input',
      'textarea[placeholder*="논문"]',
      'textarea[placeholder*="본문"]',
      'textarea[placeholder*="붙여넣기"]',
      'textarea[placeholder*="paste"]',
      'textarea[placeholder*="텍스트"]',
      '[data-placeholder*="논문"]',
      '[data-placeholder*="붙여넣기"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (inject(el)) return true;
    }

    const textareas = document.querySelectorAll('textarea');
    for (const ta of textareas) {
      const ph = (ta.placeholder || ta.getAttribute('data-placeholder') || '').toLowerCase();
      if (ph.includes('논문') || ph.includes('본문') || ph.includes('붙여넣') || ph.includes('paste') || ta.offsetHeight > 80) {
        if (inject(ta)) return true;
      }
    }

    const anyVisible = document.querySelector('textarea');
    if (inject(anyVisible)) return true;

    return false;
  }

  function runPaste() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const content = data?.[STORAGE_KEY];
      if (!content) return;
      const ok = tryInject(content);
      if (ok) {
        chrome.storage.local.remove(STORAGE_KEY);
        console.log('[Scholar Assistant] Scholar Slide 자동 붙여넣기 완료');
      }
    });
  }

  function runWithRetries() {
    runPaste();
    [300, 800, 1500, 2500, 4000].forEach(ms => setTimeout(runPaste, ms));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => runWithRetries());
  } else {
    runWithRetries();
  }
})();
