/**
 * 폴더 관리 팝업 — 좌: 폴더 / 우: 노트북 리스트·분류
 */
(function () {
  'use strict';

  var STORE = window.ScholarNotebookFolderStore;
  if (!STORE) return;

  var snapKey = STORE.NOTEBOOK_SNAPSHOT_KEY;
  var titleKey = STORE.NOTEBOOK_TITLE_OVERRIDES_KEY || 'scholarNotebookTitleOverrides';
  var PREFS_KEY = 'scholarFolderManagerUiPrefs';

  var ui = {
    selectedKey: '__all__',
    folderSearch: '',
    leftCollapsed: false,
    classifyMode: 'inline',
    /** 오른쪽 목록: 전체 | 내 노트북 | 추천 노트북 (기본 내 노트북) */
    listScope: 'mine',
    /** 「변경」 모드에서 폴더 선택을 펼친 노트북 id */
    classifyOpen: {},
    /** 소스보기 패널 펼침 */
    sourceOpen: {},
  };

  var cache = {
    state: null,
    items: [],
    counts: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(t) {
    var el = $('status');
    if (el) el.textContent = t || '';
  }

  /** 스냅샷에 없어도 폴더에만 배정된 노트북은 목록에 표시(제목·소스는 목록 탭에서 다시 읽기로 보강) */
  function mergePlaceholdersFromAssignments(state, items) {
    var list = items.slice();
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var sid = String(list[i].id || '');
      if (sid) seen[sid] = true;
    }
    var asn = state.assignments && typeof state.assignments === 'object' ? state.assignments : {};
    Object.keys(asn).forEach(function (nid) {
      nid = String(nid || '').trim();
      if (!nid || seen[nid]) return;
      seen[nid] = true;
      var rawTitle = nid.indexOf('title:') === 0 ? nid.slice(5).trim() : nid;
      list.push({
        id: nid,
        title: rawTitle || nid,
        listSection: 'mine',
        sourceCount: 0,
        sourceLabels: [],
      });
    });
    return list;
  }

  function getSnapshot(state, cb) {
    try {
      chrome.storage.local.get([snapKey, titleKey], function (r) {
        if (chrome.runtime.lastError) {
          cb([]);
          return;
        }
        var raw = r[snapKey];
        var items = raw && Array.isArray(raw.items) ? raw.items.slice() : [];
        var ov = r[titleKey] && typeof r[titleKey] === 'object' ? r[titleKey] : {};
        items = mergePlaceholdersFromAssignments(state, items);
        items.forEach(function (it) {
          var oid = String(it.id || '');
          var ovTitle = oid && ov[oid] != null ? String(ov[oid]).trim().slice(0, 200) : '';
          it.displayTitle = ovTitle || String(it.title || oid).trim() || oid;
          it.sourceCount = typeof it.sourceCount === 'number' && it.sourceCount >= 0 ? it.sourceCount : 0;
          it.sourceLabels = Array.isArray(it.sourceLabels) ? it.sourceLabels : [];
        });
        cb(items);
      });
    } catch (_) {
      cb([]);
    }
  }

  function saveTitleOverride(notebookId, title, cb) {
    var nid = String(notebookId || '').trim();
    if (!nid) {
      if (cb) cb();
      return;
    }
    var t = String(title || '').trim().slice(0, 200);
    try {
      chrome.storage.local.get(titleKey, function (r) {
        var ov = r[titleKey] && typeof r[titleKey] === 'object' ? Object.assign({}, r[titleKey]) : {};
        if (!t) delete ov[nid];
        else ov[nid] = t;
        chrome.storage.local.set({ [titleKey]: ov }, function () {
          void chrome.runtime.lastError;
          if (cb) cb();
        });
      });
    } catch (_) {
      if (cb) cb();
    }
  }

  function loadPrefs(cb) {
    try {
      chrome.storage.local.get(PREFS_KEY, function (r) {
        var p = r[PREFS_KEY];
        if (p && (p.classifyMode === 'change' || p.classifyMode === 'inline')) {
          ui.classifyMode = p.classifyMode;
        }
        if (p && (p.listScope === 'all' || p.listScope === 'mine' || p.listScope === 'recommended')) {
          ui.listScope = p.listScope;
        } else {
          ui.listScope = 'mine';
        }
        var sel = $('classifyMode');
        if (sel) sel.value = ui.classifyMode;
        syncListScopeTabActive();
        if (cb) cb();
      });
    } catch (_) {
      if (cb) cb();
    }
  }

  function savePrefs() {
    try {
      chrome.storage.local.set({
        [PREFS_KEY]: { classifyMode: ui.classifyMode, listScope: ui.listScope },
      });
    } catch (_) {}
  }

  function normalizeListSection(it) {
    return it && it.listSection === 'recommended' ? 'recommended' : 'mine';
  }

  function filterByListScope(items) {
    if (ui.listScope === 'all') return items.slice();
    if (ui.listScope === 'recommended') {
      return items.filter(function (it) {
        return normalizeListSection(it) === 'recommended';
      });
    }
    return items.filter(function (it) {
      return normalizeListSection(it) !== 'recommended';
    });
  }

  function scopeCounts(items) {
    var all = items.length;
    var rec = 0;
    items.forEach(function (it) {
      if (normalizeListSection(it) === 'recommended') rec++;
    });
    return { all: all, mine: all - rec, recommended: rec };
  }

  function syncListScopeTabActive() {
    ['all', 'mine', 'recommended'].forEach(function (s) {
      var btn = document.querySelector('.nb-scope-tab[data-scope="' + s + '"]');
      if (btn) btn.setAttribute('data-active', ui.listScope === s ? '1' : '0');
    });
  }

  function syncListScopeCounts(state) {
    if (!state || !cache.items) return;
    var base = itemsForSelection(state, cache.items);
    var c = scopeCounts(base);
    var elAll = $('cntScopeAll');
    var elMine = $('cntScopeMine');
    var elRec = $('cntScopeRec');
    if (elAll) elAll.textContent = String(c.all);
    if (elMine) elMine.textContent = String(c.mine);
    if (elRec) elRec.textContent = String(c.recommended);
  }

  function countAssignments(state, items) {
    var counts = { all: items.length, unassigned: 0, mine: 0, recommended: 0 };
    state.folders.forEach(function (f) {
      counts[f.id] = 0;
    });
    items.forEach(function (it) {
      var nid = String(it.id || '');
      var fid = state.assignments[nid];
      if (!fid) counts.unassigned++;
      else if (counts[fid] !== undefined) counts[fid]++;
      if (normalizeListSection(it) === 'recommended') counts.recommended++;
      else counts.mine++;
    });
    return counts;
  }

  function folderIdsSet(state) {
    var s = {};
    state.folders.forEach(function (f) {
      s[f.id] = true;
    });
    return s;
  }

  function ensureValidSelection(state) {
    if (
      ui.selectedKey === '__all__' ||
      ui.selectedKey === '__unassigned__' ||
      ui.selectedKey === '__section_mine__' ||
      ui.selectedKey === '__section_recommended__'
    ) {
      return;
    }
    if (!folderIdsSet(state)[ui.selectedKey]) ui.selectedKey = '__all__';
  }

  function rightPaneTitle(state) {
    if (ui.selectedKey === '__all__') return '모든 노트북';
    if (ui.selectedKey === '__section_mine__') return '내노트북';
    if (ui.selectedKey === '__section_recommended__') return '추천노트북';
    if (ui.selectedKey === '__unassigned__') return '미분류';
    var f = state.folders.find(function (x) {
      return x.id === ui.selectedKey;
    });
    return f ? f.name : '모든 노트북';
  }

  function folderNameById(state, fid) {
    if (!fid) return '미분류';
    var f = state.folders.find(function (x) {
      return x.id === fid;
    });
    return f ? f.name : '알 수 없는 폴더';
  }

  function matchesFolderSearch(name) {
    var q = (ui.folderSearch || '').trim().toLowerCase();
    if (!q) return true;
    return String(name || '')
      .toLowerCase()
      .indexOf(q) >= 0;
  }

  function renderFolderNav() {
    var ul = $('folderList');
    if (!ul || !cache.state || !cache.counts) return;
    var state = cache.state;
    var counts = cache.counts;
    ensureValidSelection(state);
    ul.innerHTML = '';

    function addNavItem(key, label, count, extraClass) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-item' + (extraClass ? ' ' + extraClass : '');
      if (ui.selectedKey === key) btn.setAttribute('data-active', '1');
      var span = document.createElement('span');
      span.textContent = label;
      var meta = document.createElement('span');
      meta.className = 'nav-meta';
      meta.textContent = String(count);
      btn.appendChild(span);
      btn.appendChild(meta);
      btn.addEventListener('click', function () {
        ui.selectedKey = key;
        renderFolderNav();
        renderNotebookList();
        syncRightTitle();
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }

    addNavItem('__all__', '전체', counts.all);
    addNavItem('__section_mine__', '내노트북', counts.mine);
    addNavItem('__section_recommended__', '추천노트북', counts.recommended);
    addNavItem('__unassigned__', '미분류', counts.unassigned);

    state.folders
      .slice()
      .sort(function (a, b) {
        return a.order - b.order || a.name.localeCompare(b.name);
      })
      .forEach(function (f) {
        if (!matchesFolderSearch(f.name)) return;
        var li = document.createElement('li');
        li.className = 'folder-row';
        var main = document.createElement('button');
        main.type = 'button';
        main.className = 'nav-item';
        if (ui.selectedKey === f.id) main.setAttribute('data-active', '1');
        var name = document.createElement('span');
        name.textContent = f.name;
        var meta = document.createElement('span');
        meta.className = 'nav-meta';
        meta.textContent = String(counts[f.id] || 0);
        main.appendChild(name);
        main.appendChild(meta);
        main.addEventListener('click', function () {
          ui.selectedKey = f.id;
          renderFolderNav();
          renderNotebookList();
          syncRightTitle();
        });
        var mini = document.createElement('div');
        mini.className = 'mini-actions';
        var ren = document.createElement('button');
        ren.type = 'button';
        ren.textContent = '이름';
        ren.title = '이름 변경';
        ren.addEventListener('click', function (e) {
          e.stopPropagation();
          var nn = window.prompt('폴더 이름', f.name);
          if (nn == null) return;
          STORE.renameFolder(f.id, nn, function () {});
        });
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'danger';
        del.textContent = '삭제';
        del.title = '폴더 삭제';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!window.confirm('폴더를 삭제할까요? 해당 폴더의 노트북은 미분류가 됩니다.')) return;
          STORE.removeFolder(f.id, function () {});
        });
        mini.appendChild(ren);
        mini.appendChild(del);
        li.appendChild(main);
        li.appendChild(mini);
        ul.appendChild(li);
      });
  }

  function syncRightTitle() {
    var h = $('rightTitle');
    if (h && cache.state) h.textContent = rightPaneTitle(cache.state);
  }

  function itemsForSelection(state, items) {
    if (ui.selectedKey === '__all__') return items.slice();
    if (ui.selectedKey === '__section_mine__') {
      return items.filter(function (it) {
        return normalizeListSection(it) !== 'recommended';
      });
    }
    if (ui.selectedKey === '__section_recommended__') {
      return items.filter(function (it) {
        return normalizeListSection(it) === 'recommended';
      });
    }
    if (ui.selectedKey === '__unassigned__') {
      return items.filter(function (it) {
        return !state.assignments[String(it.id || '')];
      });
    }
    return items.filter(function (it) {
      return state.assignments[String(it.id || '')] === ui.selectedKey;
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function notebookIdHasOpenableUrl(notebookId) {
    var id = String(notebookId || '').trim();
    if (!id || id.indexOf('title:') === 0) return false;
    return true;
  }

  function openNotebookLmInNewTab(notebookId) {
    var id = String(notebookId || '').trim();
    if (!id || id.indexOf('title:') === 0) {
      setStatus('NotebookLM 주소로 열 수 없습니다. 목록 탭에서 「목록 다시 읽기」로 갱신해 주세요.');
      return;
    }
    var url = 'https://notebooklm.google.com/notebook/' + encodeURIComponent(id);
    try {
      chrome.tabs.create({ url: url }, function () {
        void chrome.runtime.lastError;
      });
    } catch (_) {}
  }

  function buildFolderSelect(state, nid, cur) {
    var sel = document.createElement('select');
    sel.className = 'nb-sel';
    sel.setAttribute('data-nbid', nid);
    var o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = '— 미분류 —';
    if (!cur) o0.selected = true;
    sel.appendChild(o0);
    state.folders
      .slice()
      .sort(function (a, b) {
        return a.order - b.order || a.name.localeCompare(b.name);
      })
      .forEach(function (f) {
        var o = document.createElement('option');
        o.value = f.id;
        o.textContent = f.name;
        if (f.id === cur) o.selected = true;
        sel.appendChild(o);
      });
    sel.addEventListener('change', function () {
      var id = sel.getAttribute('data-nbid');
      var fid = sel.value || null;
      STORE.setAssignment(id, fid, function () {});
    });
    return sel;
  }

  function renderNotebookList() {
    var wrap = $('notebookListWrap');
    if (!wrap || !cache.state) return;
    var state = cache.state;
    var q = ($('nbFilter') && $('nbFilter').value) || '';
    var ql = q.trim().toLowerCase();
    var base = itemsForSelection(state, cache.items);
    syncListScopeCounts(state);
    syncListScopeTabActive();
    base = filterByListScope(base);
    var rows = base.filter(function (it) {
      if (!ql) return true;
      var disp = String(it.displayTitle || it.title || '').toLowerCase();
      var idl = String(it.id || '').toLowerCase();
      var srcBlob = (it.sourceLabels || []).join(' ').toLowerCase();
      var sc = String(it.sourceCount != null ? it.sourceCount : '');
      return (
        disp.indexOf(ql) >= 0 ||
        idl.indexOf(ql) >= 0 ||
        srcBlob.indexOf(ql) >= 0 ||
        (sc && sc.indexOf(ql) >= 0)
      );
    });
    wrap.innerHTML = '';
    if (!rows.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      var base0 = itemsForSelection(state, cache.items);
      var hintScope = '';
      if (cache.items.length > 0 && filterByListScope(base0).length === 0) {
        if (ui.listScope === 'mine') hintScope = ' (현재「내 노트북」만 표시 — 전체·추천 탭을 눌러 보세요)';
        else if (ui.listScope === 'recommended') hintScope = ' (현재「추천 노트북」만 표시)';
      }
      empty.textContent =
        cache.items.length === 0
          ? '노트북이 없습니다. NotebookLM 목록 탭을 연 뒤 「목록 다시 읽기」를 눌러 주세요.'
          : '이 조건에 맞는 노트북이 없습니다. 왼쪽 폴더·위쪽 표시 탭·검색어를 바꿔 보세요.' + hintScope;
      wrap.appendChild(empty);
      return;
    }
    var list = document.createElement('div');
    list.className = 'nb-list';
    rows.forEach(function (it) {
      var nid = String(it.id || '');
      var cur = state.assignments[nid] || '';
      var fname = folderNameById(state, cur);
      var disp = it.displayTitle || it.title || nid;
      var srcN = typeof it.sourceCount === 'number' ? it.sourceCount : 0;

      var card = document.createElement('div');
      card.className = 'nb-card';

      var main = document.createElement('div');
      main.className = 'nb-card-main';

      var headRow = document.createElement('div');
      headRow.className = 'nb-card-header-row';
      var titleBlock = document.createElement('div');
      titleBlock.className = 'nb-card-title-block';
      var titleEl = document.createElement('div');
      titleEl.className = 'nb-card-title';
      titleEl.textContent = disp;
      titleBlock.appendChild(titleEl);

      var tools = document.createElement('div');
      tools.className = 'nb-card-tools';
      var scount = document.createElement('span');
      scount.className = 'nb-source-count';
      scount.textContent = '소스 ' + srcN + '개';

      var btnOpenNb = document.createElement('button');
      btnOpenNb.type = 'button';
      btnOpenNb.className = 'nb-btn-secondary';
      btnOpenNb.textContent = '노트북 열기';
      var openable = notebookIdHasOpenableUrl(nid);
      btnOpenNb.disabled = !openable;
      btnOpenNb.title = openable
        ? 'NotebookLM에서 이 노트북을 새 탭으로 엽니다'
        : '목록에서 다시 읽기 전에는 주소로 열 수 없는 식별자입니다';
      btnOpenNb.addEventListener('click', function () {
        openNotebookLmInNewTab(nid);
      });

      var btnSrc = document.createElement('button');
      btnSrc.type = 'button';
      btnSrc.className = 'nb-btn-secondary';
      btnSrc.textContent = ui.sourceOpen[nid] ? '소스 접기' : '소스보기';
      btnSrc.addEventListener('click', function () {
        ui.sourceOpen[nid] = !ui.sourceOpen[nid];
        renderNotebookList();
      });

      var btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'nb-btn-secondary';
      btnEdit.textContent = '이름 바꾸기';
      btnEdit.title = '이 기기에서만 표시 이름 변경 (NotebookLM 서버 이름과 다를 수 있음)';
      btnEdit.addEventListener('click', function () {
        var nv = window.prompt('노트북 표시 이름', disp);
        if (nv === null) return;
        nv = String(nv).trim().slice(0, 200);
        saveTitleOverride(nid, nv, function () {
          fullRender();
        });
      });

      tools.appendChild(scount);
      tools.appendChild(btnOpenNb);
      tools.appendChild(btnSrc);
      tools.appendChild(btnEdit);
      headRow.appendChild(titleBlock);
      headRow.appendChild(tools);
      main.appendChild(headRow);

      var srcPanel = document.createElement('div');
      srcPanel.className = 'nb-card-sources' + (ui.sourceOpen[nid] ? '' : ' nb-card-sources--collapsed');
      var ul = document.createElement('ul');
      ul.className = 'nb-source-list';
      var labs = it.sourceLabels || [];
      if (labs.length) {
        labs.forEach(function (lab) {
          var li = document.createElement('li');
          li.textContent = lab;
          ul.appendChild(li);
        });
      } else {
        var li0 = document.createElement('li');
        li0.className = 'nb-source-empty';
        li0.textContent = srcN
          ? '카드에서 소스 제목을 가져오지 못했습니다. NotebookLM 목록에서 소스가 보이면 「목록 다시 읽기」를 눌러 주세요. (소스 ' +
            srcN +
            '개)'
          : '표시할 소스가 없습니다.';
        ul.appendChild(li0);
      }
      srcPanel.appendChild(ul);
      main.appendChild(srcPanel);

      var meta = document.createElement('div');
      meta.className = 'nb-card-meta';
      var line = document.createElement('div');
      line.className = 'nb-folder-line';
      var lab = document.createElement('span');
      lab.className = 'nb-folder-label';
      lab.innerHTML = '폴더: <strong>' + escapeHtml(fname) + '</strong>';
      line.appendChild(lab);

      var classifyWrap = document.createElement('div');
      classifyWrap.className = 'nb-classify';
      var mode = ui.classifyMode === 'change' ? 'change' : 'inline';
      var isOpen = mode === 'inline' || ui.classifyOpen[nid];

      if (mode === 'change') {
        var ch = document.createElement('button');
        ch.type = 'button';
        ch.className = 'linklike';
        ch.textContent = ui.classifyOpen[nid] ? '접기' : '변경';
        ch.addEventListener('click', function () {
          ui.classifyOpen[nid] = !ui.classifyOpen[nid];
          renderNotebookList();
        });
        line.appendChild(ch);
      }

      if (mode === 'inline' || isOpen) {
        classifyWrap.appendChild(buildFolderSelect(state, nid, cur));
      } else {
        classifyWrap.classList.add('hidden');
      }

      meta.appendChild(line);
      main.appendChild(meta);
      main.appendChild(classifyWrap);
      card.appendChild(main);
      list.appendChild(card);
    });
    wrap.appendChild(list);
  }

  function applyLeftCollapsed() {
    var left = $('leftPane');
    var exp = $('btnExpandLeft');
    var col = $('btnCollapseLeft');
    if (left) {
      if (ui.leftCollapsed) left.classList.add('collapsed');
      else left.classList.remove('collapsed');
    }
    if (exp) exp.hidden = !ui.leftCollapsed;
    if (col) col.hidden = !!ui.leftCollapsed;
  }

  function fullRender() {
    STORE.getState(function (state) {
      getSnapshot(state, function (items) {
        cache.state = state;
        cache.items = items;
        cache.counts = countAssignments(state, items);
        ensureValidSelection(state);
        renderFolderNav();
        syncRightTitle();
        renderNotebookList();
        applyLeftCollapsed();
        var sc = scopeCounts(items);
        setStatus(
          '노트북 ' +
            items.length +
            '개 (내 ' +
            sc.mine +
            ' · 추천 ' +
            sc.recommended +
            ') · 폴더 ' +
            state.folders.length +
            '개'
        );
      });
    });
  }

  function tabLooksLikeNotebookListPage(t) {
    try {
      var u = t && t.url ? String(t.url) : '';
      if (!u) return false;
      var path = new URL(u).pathname || '';
      return !/\/notebook\/[^/]+/.test(path);
    } catch (_) {
      return true;
    }
  }

  function requestRescan() {
    setStatus('목록을 다시 읽는 중…');
    try {
      chrome.tabs.query({ url: 'https://notebooklm.google.com/*' }, function (tabs) {
        if (!tabs || !tabs.length) {
          setStatus('NotebookLM 탭을 찾을 수 없습니다.');
          return;
        }
        var listish = tabs.filter(tabLooksLikeNotebookListPage);
        var toPing = listish.length ? listish : tabs;
        var pending = 0;
        toPing.forEach(function (t) {
          if (t.id) pending++;
        });
        if (!pending) {
          setTimeout(fullRender, 200);
          return;
        }
        var left = pending;
        function doneOne() {
          left--;
          if (left <= 0) setTimeout(fullRender, 450);
        }
        toPing.forEach(function (t) {
          if (!t.id) return;
          chrome.tabs.sendMessage(t.id, { action: 'scholarFolderRescanSnapshot' }, function () {
            void chrome.runtime.lastError;
            doneOne();
          });
        });
      });
    } catch (_) {
      setStatus('목록을 읽을 수 없습니다.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadPrefs(function () {
      $('btnClose')?.addEventListener('click', function () {
        window.close();
      });
      $('btnAddFolder')?.addEventListener('click', function () {
        var inp = $('newFolderName');
        var v = inp && inp.value.trim();
        if (!v) {
          setStatus('폴더 이름을 입력하세요.');
          return;
        }
        STORE.addFolder(v, function () {
          if (inp) inp.value = '';
        });
      });
      $('btnRescan')?.addEventListener('click', requestRescan);
      $('nbFilter')?.addEventListener('input', function () {
        renderNotebookList();
      });
      $('folderSearch')?.addEventListener('input', function () {
        ui.folderSearch = $('folderSearch').value;
        renderFolderNav();
      });
      $('classifyMode')?.addEventListener('change', function () {
        ui.classifyMode = $('classifyMode').value === 'change' ? 'change' : 'inline';
        ui.classifyOpen = {};
        ui.sourceOpen = {};
        savePrefs();
        renderNotebookList();
      });
      $('btnCollapseLeft')?.addEventListener('click', function () {
        ui.leftCollapsed = true;
        applyLeftCollapsed();
      });
      $('btnExpandLeft')?.addEventListener('click', function () {
        ui.leftCollapsed = false;
        applyLeftCollapsed();
      });

      document.querySelectorAll('.nb-scope-tab[data-scope]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var s = btn.getAttribute('data-scope');
          if (s !== 'all' && s !== 'mine' && s !== 'recommended') return;
          ui.listScope = s;
          syncListScopeTabActive();
          savePrefs();
          renderNotebookList();
        });
      });

      try {
        chrome.storage.onChanged.addListener(function (_changes, area) {
          if (area === 'sync' || area === 'local') fullRender();
        });
      } catch (_) {}

      fullRender();
    });
  });
})();
