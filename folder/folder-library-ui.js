/**
 * NotebookLM 노트북 라이브러리 — 폴더 사이드바·필터·카드별 폴더 지정
 */
(function (global) {
  'use strict';

  var STORE = global.ScholarNotebookFolderStore;
  if (!STORE) return;

  var MARKER_ROOT = 'data-scholar-folder-ui-root';
  var MARKER_CARD = 'data-scholar-folder-card-bound';
  var STYLE_ID = 'scholar-folder-library-style';
  var STORAGE_SIDEBAR_COLLAPSED = 'scholarFolderSidebarCollapsed';

  var state = {
    initialized: false,
    activeFilter: 'all',
    folderSearch: '',
    /** 기본 접힘 — 사용자가 펼친 경우 local 에만 false 저장 */
    collapsed: true,
    lastState: null,
    mo: null,
    debounce: null,
    snapTimer: null,
    msgBound: false,
  };

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.scholar-folder-sidebar{position:fixed;left:0;top:0;height:100vh;width:268px;max-width:92vw;',
      'background:#0f172a;border-right:1px solid #334155;z-index:2147483000;',
      'display:flex;flex-direction:column;font-family:system-ui,Segoe UI,Roboto,sans-serif;',
      'box-shadow:4px 0 24px rgba(0,0,0,.25);transition:transform .2s ease,width .2s ease;}',
      '.scholar-folder-sidebar[data-collapsed="1"]{width:48px;}',
      '.scholar-folder-sidebar[data-collapsed="1"] .scholar-folder-body{display:none;}',
      '.scholar-folder-sidebar[data-collapsed="1"] .scholar-folder-search{display:none;}',
      '.scholar-folder-sidebar[data-collapsed="1"] .scholar-folder-title{display:none;}',
      '.scholar-folder-head{padding:10px 10px 8px;border-bottom:1px solid #1e293b;flex-shrink:0;}',
      '.scholar-folder-head-row{display:flex;align-items:center;gap:8px;}',
      '.scholar-folder-title{color:#e2e8f0;font-weight:800;font-size:13px;flex:1;}',
      '.scholar-folder-iconbtn{border:1px solid #334155;background:#1e293b;color:#e2e8f0;border-radius:8px;',
      'width:32px;height:32px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;line-height:1;}',
      '.scholar-folder-iconbtn:hover{background:#334155;}',
      '.scholar-folder-search{width:100%;box-sizing:border-box;margin-top:8px;padding:8px 10px;border-radius:8px;',
      'border:1px solid #334155;background:#020617;color:#e2e8f0;font-size:12px;}',
      '.scholar-folder-body{flex:1;overflow:auto;padding:8px 8px 16px;}',
      '.scholar-folder-item{width:100%;text-align:left;padding:10px 10px;border-radius:10px;border:1px solid transparent;',
      'background:transparent;color:#e2e8f0;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:6px;display:flex;',
      'align-items:center;justify-content:space-between;gap:8px;}',
      '.scholar-folder-item:hover{background:#1e293b;}',
      '.scholar-folder-item[data-active="1"]{background:#1d4ed8;border-color:#2563eb;color:#fff;}',
      '.scholar-folder-item-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.scholar-folder-item-meta{opacity:.75;font-weight:600;font-size:11px;flex-shrink:0;}',
      '.scholar-folder-managebtn{margin-top:8px;width:100%;padding:12px 10px;border-radius:10px;border:1px solid #2563eb;',
      'background:#1d4ed8;color:#fff;font-weight:800;font-size:12px;cursor:pointer;}',
      '.scholar-folder-managebtn:hover{background:#1e40af;}',
      'project-button[data-scholar-folder-hidden="1"],tr.mat-mdc-row[data-scholar-folder-hidden="1"]{display:none!important;}',
      '.scholar-folder-chip{margin-left:8px;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;',
      'border:1px solid #334155;background:#0f172a;color:#cbd5e1;font-size:11px;font-weight:700;cursor:pointer;vertical-align:middle;}',
      '.scholar-folder-chip:hover{background:#1e293b;}',
      '.scholar-folder-overlay{position:fixed;inset:0;background:rgba(2,6,23,.55);z-index:2147483640;display:flex;',
      'align-items:center;justify-content:center;padding:16px;}',
      '.scholar-folder-modal{background:#0f172a;border:1px solid #334155;border-radius:14px;max-width:420px;width:100%;',
      'padding:16px;color:#e2e8f0;box-shadow:0 24px 80px rgba(0,0,0,.45);}',
      '.scholar-folder-modal h3{margin:0 0 12px;font-size:15px;}',
      '.scholar-folder-pickbtn{display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:8px;border-radius:10px;',
      'border:1px solid #334155;background:#020617;color:#e2e8f0;font-weight:700;cursor:pointer;font-size:12px;}',
      '.scholar-folder-pickbtn:hover{background:#1e293b;}',
      '.scholar-folder-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;}',
      '.scholar-folder-btn{border-radius:10px;padding:8px 14px;font-weight:800;font-size:12px;cursor:pointer;border:1px solid #334155;',
      'background:#1e293b;color:#e2e8f0;}',
      '.scholar-folder-btn-primary{background:#2563eb;border-color:#1d4ed8;color:#fff;}',
    ].join('');
    document.documentElement.appendChild(st);
  }

  function isNotebookLmHost() {
    try {
      return /notebooklm\.google\.com$/i.test(location.hostname);
    } catch (_) {
      return false;
    }
  }

  /** NotebookLM이 링크·제목을 Shadow DOM 안에 두는 경우 대비 */
  function queryDeepAll(root, selector) {
    var out = [];
    function walk(el) {
      try {
        var n = el.querySelectorAll(selector);
        for (var i = 0; i < n.length; i++) out.push(n[i]);
        var all = el.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) walk(all[j].shadowRoot);
        }
      } catch (_) {}
    }
    walk(root || document.body);
    return out;
  }

  function deepQuerySelector(root, selector) {
    if (!root) return null;
    try {
      var direct = root.querySelector(selector);
      if (direct) return direct;
      var all = root.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        if (all[i].shadowRoot) {
          var inner = deepQuerySelector(all[i].shadowRoot, selector);
          if (inner) return inner;
        }
      }
    } catch (_) {}
    return null;
  }

  /** 한 노트북 카드(row) 안만 깊게 탐색 */
  function queryDeepAllUnder(root, selector) {
    var out = [];
    if (!root) return out;
    function walk(el) {
      try {
        var n = el.querySelectorAll(selector);
        for (var i = 0; i < n.length; i++) out.push(n[i]);
        var all = el.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) walk(all[j].shadowRoot);
        }
      } catch (_) {}
    }
    walk(root);
    return out;
  }

  function extractSourceCountFromRow(row) {
    try {
      var text = (row.innerText || row.textContent || '').replace(/\s+/g, ' ');
      var m =
        text.match(/소스\s*(\d+)\s*개/i) ||
        text.match(/(\d+)\s*sources?/i) ||
        text.match(/sources?\s*[·•:]\s*(\d+)/i) ||
        text.match(/\b(\d+)\s*files?\b/i);
      if (m) {
        var n = parseInt(m[1], 10);
        return isFinite(n) && n >= 0 ? n : 0;
      }
    } catch (_) {}
    return 0;
  }

  function extractSourceLabelsFromRow(row, titleGuess) {
    var labels = [];
    var seen = {};
    try {
      var chips = queryDeepAllUnder(
        row,
        'mat-chip, .mat-mdc-chip, [class*="mat-mdc-chip"], [class*="source"] li, [role="listitem"]'
      );
      for (var i = 0; i < chips.length; i++) {
        var t = (chips[i].textContent || '').replace(/\s+/g, ' ').trim();
        if (t.length < 2 || t.length > 200) continue;
        if (/소스\s*\d+/i.test(t)) continue;
        if (titleGuess && t === titleGuess) continue;
        if (/^\d{4}\s*[.\-/]\s*\d{1,2}/.test(t)) continue;
        if (seen[t]) continue;
        seen[t] = true;
        labels.push(t);
        if (labels.length >= 24) break;
      }
    } catch (_) {}
    return labels;
  }

  function findNotebookRows() {
    var a = queryDeepAll(document.body, 'project-button');
    if (a.length) return a;
    return queryDeepAll(document.body, 'tr.mat-mdc-row').filter(function (tr) {
      return !!deepQuerySelector(tr, 'a[href*="/notebook/"]');
    });
  }

  function getNotebookIdFromEl(el) {
    if (!el) return null;
    var a = deepQuerySelector(el, 'a[href*="/notebook/"]');
    if (!a && el.matches && el.matches('a[href*="/notebook/"]')) a = el;
    if (a) {
      var href = a.getAttribute('href') || '';
      var m = href.match(/\/notebook\/([^/?#]+)/);
      if (m && m[1]) return m[1];
    }
    var title = deepQuerySelector(el, '.project-button-title, .project-table-title, [class*="project-button-title"]');
    if (title) {
      var t = (title.textContent || '').trim();
      if (t.length >= 2) return 'title:' + t.slice(0, 120);
    }
    return null;
  }

  function shouldShowLibraryUi() {
    if (!isNotebookLmHost()) return false;
    return findNotebookRows().length >= 1;
  }

  /** 단일 노트북 편집 화면 등 — 목록 카드가 없어 스냅샷을 비우면 안 되는 URL */
  function isLikelyNotebookDetailPage() {
    try {
      var p = location.pathname || '';
      return /\/notebook\/[^/]+/.test(p);
    } catch (_) {
      return false;
    }
  }

  /** 구역 제목만 보고 추천 / 내(최근) — 매칭 없으면 null (이전 구역 유지) */
  function classifyHeadingToSectionOrNull(raw) {
    var low = String(raw || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!low) return null;
    if (
      /추천|recommended|recommendation|discover|for\s*you|suggested|큐레이트|picked|you\s*might|editor'?s?\s*picks/i.test(
        low
      )
    ) {
      return 'recommended';
    }
    if (/내\s*노트북|최근\s*노트북|내노트북|my\s*notebooks|recent|내\s*문서|owned/i.test(low)) {
      return 'mine';
    }
    return null;
  }

  /**
   * 화면에 그려진 노트북 카드 순서대로, 직전에 나온 구역 제목(h2 등)에 따라 listSection 부여.
   * NotebookLM 본문 트리만 순회(확장 사이드바·오버레이 제외).
   */
  function buildNotebookListSectionMap() {
    var map = {};
    var current = 'mine';
    var walker = null;
    try {
      walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (node) {
          try {
            if (node.closest && node.closest('[data-scholar-folder-ui-root="1"]')) return NodeFilter.FILTER_REJECT;
            if (node.closest && node.closest('.scholar-folder-overlay')) return NodeFilter.FILTER_REJECT;
          } catch (_) {}
          return NodeFilter.FILTER_ACCEPT;
        },
      });
    } catch (_) {
      walker = null;
    }
    if (!walker) return map;
    function isLikelyVisible(el) {
      try {
        var r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        var st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
        if (Number(st.opacity || '1') === 0) return false;
      } catch (_) {
        return true;
      }
      return true;
    }
    var n;
    while ((n = walker.nextNode())) {
      if (!n || !n.matches) continue;
      if (n.matches('h1, h2, h3, h4, [role="heading"]')) {
        var raw = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (raw.length > 120) raw = raw.slice(0, 120);
        var next = classifyHeadingToSectionOrNull(raw);
        if (next !== null) current = next;
        continue;
      }
      if (n.matches('project-button')) {
        if (!isLikelyVisible(n)) continue;
        var id = getNotebookIdFromEl(n);
        if (id) map[id] = current;
        continue;
      }
      if (n.matches('tr.mat-mdc-row') && deepQuerySelector(n, 'a[href*="/notebook/"]')) {
        if (!isLikelyVisible(n)) continue;
        var id2 = getNotebookIdFromEl(n);
        if (id2) map[id2] = current;
      }
    }
    return map;
  }

  /** 카드 세로 위치보다 위에 있는 마지막 구역 제목으로 보조 분류 */
  function sectionByVerticalHeadings(row) {
    var ry = 0;
    try {
      ry = row.getBoundingClientRect().top + window.scrollY;
    } catch (_) {
      return 'mine';
    }
    var heads = queryDeepAll(document.body, 'h2, h3, h4');
    var list = [];
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i];
      try {
        if (h.closest && h.closest('[data-scholar-folder-ui-root="1"]')) continue;
      } catch (_) {}
      var t = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 100) continue;
      var y = 0;
      try {
        y = h.getBoundingClientRect().top + window.scrollY;
      } catch (_) {
        continue;
      }
      list.push({ y: y, t: t.toLowerCase() });
    }
    list.sort(function (a, b) {
      return a.y - b.y;
    });
    var section = 'mine';
    for (var j = 0; j < list.length; j++) {
      if (list[j].y > ry + 12) break;
      var nx = classifyHeadingToSectionOrNull(list[j].t);
      if (nx !== null) section = nx;
    }
    return section;
  }

  function listSectionForNotebookRow(row, sectionMap) {
    var id = getNotebookIdFromEl(row);
    if (!id) return 'mine';
    if (Object.prototype.hasOwnProperty.call(sectionMap, id)) {
      var s = sectionMap[id];
      if (s === 'recommended' || s === 'mine') return s;
    }
    var v = sectionByVerticalHeadings(row);
    return v === 'recommended' ? 'recommended' : 'mine';
  }

  function snapshotNotebooksToStorage(cb) {
    var key = STORE.NOTEBOOK_SNAPSHOT_KEY;
    var items = [];
    var sectionMap = buildNotebookListSectionMap();
    findNotebookRows().forEach(function (row) {
      var id = getNotebookIdFromEl(row);
      if (!id) return;
      var title = '';
      var t = deepQuerySelector(row, '.project-button-title, .project-table-title, [class*="project-button-title"]');
      if (t) title = (t.textContent || '').trim();
      if (!title) title = id;
      var srcCount = extractSourceCountFromRow(row);
      var srcLabels = extractSourceLabelsFromRow(row, title);
      items.push({
        id: id,
        title: title,
        listSection: listSectionForNotebookRow(row, sectionMap),
        sourceCount: srcCount,
        sourceLabels: srcLabels,
      });
    });
    var byId = {};
    items.forEach(function (it) {
      var id = it.id;
      if (!byId[id]) {
        byId[id] = it;
        return;
      }
      var p = byId[id];
      p.sourceCount = Math.max(p.sourceCount || 0, it.sourceCount || 0);
      var seen = {};
      (p.sourceLabels || []).concat(it.sourceLabels || []).forEach(function (x) {
        if (x) seen[String(x).trim()] = true;
      });
      p.sourceLabels = Object.keys(seen).slice(0, 32);
      if (p.listSection !== 'recommended' && it.listSection === 'recommended') p.listSection = 'recommended';
    });
    items = Object.keys(byId).map(function (k) {
      return byId[k];
    });

    function writeSnapshot() {
      try {
        var payload = {};
        payload[key] = { updated: Date.now(), items: items };
        chrome.storage.local.set(payload, function () {
          void chrome.runtime.lastError;
          if (cb) cb();
        });
      } catch (_) {
        if (cb) cb();
      }
    }

    if (items.length === 0 && isLikelyNotebookDetailPage()) {
      try {
        chrome.storage.local.get(key, function (r) {
          void chrome.runtime.lastError;
          var prev = r && r[key];
          if (prev && Array.isArray(prev.items) && prev.items.length > 0) {
            if (cb) cb();
            return;
          }
          writeSnapshot();
        });
      } catch (_) {
        writeSnapshot();
      }
      return;
    }
    writeSnapshot();
  }

  function openFolderManagerWindow() {
    snapshotNotebooksToStorage(function () {
      try {
        chrome.runtime.sendMessage(
          { action: 'openWindow', url: 'folder/folder-manager.html', width: 1040, height: 760 },
          function (res) {
            if (chrome.runtime.lastError || !res || !res.ok) {
              try {
                window.open(
                  chrome.runtime.getURL('folder/folder-manager.html'),
                  'scholarFolderMgr',
                  'width=1040,height=760'
                );
              } catch (_) {}
            }
          }
        );
      } catch (_) {
        try {
          window.open(
            chrome.runtime.getURL('folder/folder-manager.html'),
            'scholarFolderMgr',
            'width=1040,height=760'
          );
        } catch (_) {}
      }
    });
  }

  function syncCollapseUi(root) {
    if (!root) return;
    try {
      root.setAttribute('data-collapsed', state.collapsed ? '1' : '0');
      var collapseBtn = root.querySelector('.scholar-folder-head-row .scholar-folder-iconbtn');
      if (collapseBtn) collapseBtn.textContent = state.collapsed ? '›' : '‹';
    } catch (_) {}
  }

  function countByFolder(syncState) {
    var counts = { all: 0, unassigned: 0, mine: 0, recommended: 0 };
    syncState.folders.forEach(function (f) {
      counts[f.id] = 0;
    });
    var rows = findNotebookRows();
    var sectionMap = buildNotebookListSectionMap();
    counts.all = rows.length;
    rows.forEach(function (row) {
      var id = getNotebookIdFromEl(row);
      if (!id) return;
      var sec = listSectionForNotebookRow(row, sectionMap);
      if (sec === 'recommended') counts.recommended++;
      else counts.mine++;
      var fid = syncState.assignments[id];
      if (!fid) counts.unassigned++;
      else if (counts[fid] !== undefined) counts[fid]++;
    });
    return counts;
  }

  function applyRowVisibility(syncState) {
    var rows = findNotebookRows();
    var af = state.activeFilter;
    var sectionMap = buildNotebookListSectionMap();
    rows.forEach(function (row) {
      var nid = getNotebookIdFromEl(row);
      var fid = nid ? syncState.assignments[nid] : null;
      var show = true;
      if (af === 'all') show = true;
      else if (af === '__section_mine__') {
        show = listSectionForNotebookRow(row, sectionMap) === 'mine';
      } else if (af === '__section_recommended__') {
        show = listSectionForNotebookRow(row, sectionMap) === 'recommended';
      } else if (af === '__unassigned__') show = !fid;
      else show = fid === af;
      if (show) row.removeAttribute('data-scholar-folder-hidden');
      else row.setAttribute('data-scholar-folder-hidden', '1');
    });
  }

  function openPickModal(notebookId, syncState) {
    var overlay = document.createElement('div');
    overlay.className = 'scholar-folder-overlay';
    var modal = document.createElement('div');
    modal.className = 'scholar-folder-modal';
    var h = document.createElement('h3');
    h.textContent = '노트북 폴더 지정';
    modal.appendChild(h);

    function addPick(label, folderId) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'scholar-folder-pickbtn';
      b.textContent = label;
      b.addEventListener('click', function () {
        STORE.setAssignment(notebookId, folderId, function () {
          overlay.remove();
        });
      });
      modal.appendChild(b);
    }

    addPick('— 미분류(폴더 해제) —', null);
    syncState.folders
      .slice()
      .sort(function (a, b) {
        return a.order - b.order || a.name.localeCompare(b.name);
      })
      .forEach(function (f) {
        addPick(f.name, f.id);
      });

    var actions = document.createElement('div');
    actions.className = 'scholar-folder-modal-actions';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'scholar-folder-btn';
    cancel.textContent = '닫기';
    cancel.addEventListener('click', function () {
      overlay.remove();
    });
    actions.appendChild(cancel);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.documentElement.appendChild(overlay);
  }

  function ensureRowChip(row, syncState) {
    if (!row.querySelector || row.getAttribute(MARKER_CARD) === '1') return;
    var nid = getNotebookIdFromEl(row);
    if (!nid) return;

    var titleHost =
      deepQuerySelector(row, '.project-button-title, .project-table-title, [class*="project-button-title"]') ||
      deepQuerySelector(row, 'a[href*="/notebook/"]');
    if (!titleHost || !titleHost.parentElement) titleHost = row;

    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'scholar-folder-chip';
    chip.setAttribute('data-scholar-folder-chip', '1');

    function renderChip() {
      var fid = syncState.assignments[nid];
      var name = '폴더';
      if (fid) {
        var f = syncState.folders.find(function (x) {
          return x.id === fid;
        });
        if (f) name = f.name;
        else name = '폴더(삭제됨)';
      } else name = '미분류';
      chip.textContent = '📁 ' + name;
    }
    renderChip();
    chip.title = '클릭: 이 노트북이 속한 폴더로 목록 필터 · Shift+클릭: 폴더 변경';
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        STORE.getState(function (s) {
          openPickModal(nid, s);
        });
        return;
      }
      STORE.getState(function (s) {
        var fid = s.assignments[nid];
        state.activeFilter = fid ? fid : '__unassigned__';
        state.collapsed = false;
        try {
          chrome.storage.local.set({ [STORAGE_SIDEBAR_COLLAPSED]: false });
        } catch (_) {}
        var root = document.querySelector('[' + MARKER_ROOT + '="1"]');
        state.lastState = s;
        syncCollapseUi(root);
        if (root) renderSidebar(root, s);
        applyRowVisibility(s);
      });
    });

    if (titleHost.nextSibling) titleHost.parentElement.insertBefore(chip, titleHost.nextSibling);
    else titleHost.parentElement.appendChild(chip);
    row.setAttribute(MARKER_CARD, '1');
  }

  function refreshRowChips(syncState) {
    findNotebookRows().forEach(function (row) {
      row.removeAttribute(MARKER_CARD);
      var old = row.querySelector && row.querySelector('[data-scholar-folder-chip="1"]');
      if (old) old.remove();
    });
    findNotebookRows().forEach(function (row) {
      ensureRowChip(row, syncState);
    });
  }

  function renderSidebar(root, syncState) {
    var body = root.querySelector('.scholar-folder-body');
    if (!body) return;
    body.innerHTML = '';
    var counts = countByFolder(syncState);

    function addItem(key, label, count) {
      if (state.folderSearch) {
        var q = state.folderSearch.toLowerCase();
        if (key !== 'all' && key !== '__unassigned__') {
          if (label.toLowerCase().indexOf(q) < 0) return;
        }
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'scholar-folder-item';
      b.setAttribute('data-folder-key', key);
      if (state.activeFilter === key) b.setAttribute('data-active', '1');
      var name = document.createElement('span');
      name.className = 'scholar-folder-item-name';
      name.textContent = label;
      var meta = document.createElement('span');
      meta.className = 'scholar-folder-item-meta';
      meta.textContent = String(count);
      b.appendChild(name);
      b.appendChild(meta);
      b.addEventListener('click', function () {
        state.activeFilter = key;
        renderSidebar(root, syncState);
        applyRowVisibility(syncState);
        schedule();
      });
      body.appendChild(b);
    }

    addItem('all', '전체', counts.all);
    addItem('__section_mine__', '내노트북', counts.mine);
    addItem('__section_recommended__', '추천노트북', counts.recommended);
    addItem('__unassigned__', '미분류', counts.unassigned);

    syncState.folders
      .slice()
      .sort(function (a, b) {
        return a.order - b.order || a.name.localeCompare(b.name);
      })
      .forEach(function (f) {
        if (state.folderSearch && f.name.toLowerCase().indexOf(state.folderSearch.toLowerCase()) < 0) return;
        var fb = document.createElement('button');
        fb.type = 'button';
        fb.className = 'scholar-folder-item';
        if (state.activeFilter === f.id) fb.setAttribute('data-active', '1');
        var fn = document.createElement('span');
        fn.className = 'scholar-folder-item-name';
        fn.textContent = f.name;
        var fm = document.createElement('span');
        fm.className = 'scholar-folder-item-meta';
        fm.textContent = String(counts[f.id] || 0);
        fb.appendChild(fn);
        fb.appendChild(fm);
        fb.addEventListener('click', function () {
          state.activeFilter = f.id;
          renderSidebar(root, syncState);
          applyRowVisibility(syncState);
          schedule();
        });
        body.appendChild(fb);
      });

    var manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'scholar-folder-managebtn';
    manage.textContent = '폴더 관리';
    manage.title = '폴더·노트북 배정 (팝업 창)';
    manage.addEventListener('click', function () {
      openFolderManagerWindow();
    });
    body.appendChild(manage);
  }

  function ensureSidebar(syncState) {
    var root = document.querySelector('[' + MARKER_ROOT + '="1"]');
    if (!root) {
      injectStyle();
      root = document.createElement('div');
      root.setAttribute(MARKER_ROOT, '1');
      root.className = 'scholar-folder-sidebar';
      root.setAttribute('data-collapsed', state.collapsed ? '1' : '0');

      var head = document.createElement('div');
      head.className = 'scholar-folder-head';
      var row = document.createElement('div');
      row.className = 'scholar-folder-head-row';
      var title = document.createElement('div');
      title.className = 'scholar-folder-title';
      title.textContent = '폴더';
      var collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'scholar-folder-iconbtn';
      collapseBtn.title = '접기/펼치기';
      collapseBtn.textContent = state.collapsed ? '›' : '‹';
      collapseBtn.addEventListener('click', function () {
        state.collapsed = !state.collapsed;
        syncCollapseUi(root);
        try {
          chrome.storage.local.set({ [STORAGE_SIDEBAR_COLLAPSED]: state.collapsed });
        } catch (_) {}
      });
      row.appendChild(title);
      row.appendChild(collapseBtn);
      head.appendChild(row);

      var search = document.createElement('input');
      search.type = 'search';
      search.className = 'scholar-folder-search';
      search.placeholder = '폴더 검색…';
      search.addEventListener('input', function () {
        state.folderSearch = search.value.trim();
        if (state.lastState) renderSidebar(root, state.lastState);
        else STORE.getState(function (ns) { renderSidebar(root, ns); });
      });
      head.appendChild(search);

      var body = document.createElement('div');
      body.className = 'scholar-folder-body';
      root.appendChild(head);
      root.appendChild(body);
      document.documentElement.appendChild(root);
    }
    renderSidebar(root, syncState);
    syncCollapseUi(root);
  }

  function syncAll() {
    STORE.getState(function (s) {
      state.lastState = s;
      if (!shouldShowLibraryUi()) {
        var old = document.querySelector('[' + MARKER_ROOT + '="1"]');
        if (old) old.remove();
        findNotebookRows().forEach(function (row) {
          row.removeAttribute('data-scholar-folder-hidden');
          row.removeAttribute(MARKER_CARD);
          var c = row.querySelector && row.querySelector('[data-scholar-folder-chip="1"]');
          if (c) c.remove();
        });
        return;
      }
      ensureSidebar(s);
      applyRowVisibility(s);
      refreshRowChips(s);
      if (state.snapTimer) clearTimeout(state.snapTimer);
      state.snapTimer = setTimeout(function () {
        snapshotNotebooksToStorage();
      }, 500);
    });
  }

  function schedule() {
    if (state.debounce) clearTimeout(state.debounce);
    state.debounce = setTimeout(syncAll, 160);
  }

  function init() {
    if (state.initialized) {
      schedule();
      return;
    }
    state.initialized = true;

    function wireAfterCollapsePref() {
      if (!state.msgBound) {
        state.msgBound = true;
        try {
          chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
            if (msg && msg.action === 'scholarFolderRescanSnapshot') {
              snapshotNotebooksToStorage(function () {
                sendResponse({ ok: true });
              });
              return true;
            }
          });
        } catch (_) {}
      }

      try {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (area === 'local' && STORE.NOTEBOOK_TITLE_OVERRIDES_KEY && changes[STORE.NOTEBOOK_TITLE_OVERRIDES_KEY]) {
            schedule();
            return;
          }
          if (area !== 'sync' || !changes[STORE.STORAGE_KEY]) return;
          var nv = changes[STORE.STORAGE_KEY].newValue;
          state.lastState = STORE.normalize(nv || {});
          schedule();
        });
      } catch (_) {}

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', schedule);
      } else {
        schedule();
      }

      state.mo = new MutationObserver(function () {
        schedule();
      });
      try {
        state.mo.observe(document.body, { childList: true, subtree: true });
      } catch (_) {}
    }

    try {
      chrome.storage.local.get(STORAGE_SIDEBAR_COLLAPSED, function (r) {
        if (!chrome.runtime.lastError && r[STORAGE_SIDEBAR_COLLAPSED] === false) {
          state.collapsed = false;
        } else {
          state.collapsed = true;
        }
        wireAfterCollapsePref();
      });
    } catch (_) {
      state.collapsed = true;
      wireAfterCollapsePref();
    }
  }

  global.ScholarNotebookFolderUI = {
    init: init,
    syncAll: syncAll,
    openFolderManagerWindow: openFolderManagerWindow,
  };
})(typeof window !== 'undefined' ? window : self);
