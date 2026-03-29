/* Scholar Assistant - Special Rules */

(function () {
  'use strict';

  const DEFAULT_RULES = Object.freeze({
    doubleSpaceBeforeDivider: true,
  });

  function normalizeText(value) {
    return String(value || '');
  }

  function applyBlankLineBeforeDivider(text) {
    const src = normalizeText(text);
    if (!src) return src;
    const lines = src.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isDivider = /^-{8,}\s*$/.test(line);
      if (isDivider) {
        const prev = out[out.length - 1] || '';
        if (prev.trim()) out.push('');
      }
      out.push(line);
    }
    return out.join('\n');
  }

  function applyRules(text, rules = {}) {
    const merged = { ...DEFAULT_RULES, ...(rules || {}) };
    let next = normalizeText(text);
    if (merged.doubleSpaceBeforeDivider) {
      next = applyBlankLineBeforeDivider(next);
    }
    return next;
  }

  window.SpecialRuls = {
    DEFAULT_RULES,
    applyRules,
    applyBlankLineBeforeDivider,
  };
})();
