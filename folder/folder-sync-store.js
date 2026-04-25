/**
 * NotebookLM 폴더/배정 상태 — chrome.storage.sync 동기화
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'scholarNotebookFolderState';
  /** NotebookLM 탭에서 수집한 노트북 목록 스냅샷 (local) — 폴더 관리 팝업에서 표시 */
  const NOTEBOOK_SNAPSHOT_KEY = 'scholarFolderManagerNotebookList';
  /** 노트북 표시용 제목 덮어쓰기 (NotebookLM 서버 이름 변경 아님) */
  const NOTEBOOK_TITLE_OVERRIDES_KEY = 'scholarNotebookTitleOverrides';

  function normalize(s) {
    const raw = s && typeof s === 'object' ? s : {};
    const folders = Array.isArray(raw.folders)
      ? raw.folders
          .map(function (f) {
            return {
              id: String(f.id || ''),
              name: String(f.name || '').trim().slice(0, 80),
              order: Number(f.order) || 0,
            };
          })
          .filter(function (f) {
            return !!f.id;
          })
      : [];
    const assignments =
      raw.assignments && typeof raw.assignments === 'object' ? Object.assign({}, raw.assignments) : {};
    Object.keys(assignments).forEach(function (k) {
      if (assignments[k] == null || assignments[k] === '') delete assignments[k];
    });
    return { v: 1, folders: folders, assignments: assignments };
  }

  function getState(cb) {
    try {
      chrome.storage.sync.get(STORAGE_KEY, function (r) {
        if (chrome.runtime.lastError) {
          cb(normalize({}));
          return;
        }
        cb(normalize(r[STORAGE_KEY]));
      });
    } catch (_) {
      cb(normalize({}));
    }
  }

  function saveState(state, cb) {
    const payload = normalize(state);
    try {
      chrome.storage.sync.set({ [STORAGE_KEY]: payload }, function () {
        if (cb) cb(!chrome.runtime.lastError);
      });
    } catch (_) {
      if (cb) cb(false);
    }
  }

  function update(mutator, cb) {
    getState(function (s) {
      var next;
      try {
        next = mutator(JSON.parse(JSON.stringify(s)));
      } catch (_) {
        next = normalize(s);
      }
      saveState(next, cb);
    });
  }

  function addFolder(name, cb) {
    var n = String(name || '').trim().slice(0, 80);
    if (!n) {
      if (cb) cb(false);
      return;
    }
    var id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    update(function (s) {
      var order = 0;
      if (s.folders.length) {
        order = Math.max.apply(
          null,
          s.folders.map(function (f) {
            return f.order;
          })
        ) + 1;
      }
      s.folders.push({ id: id, name: n, order: order });
      return s;
    }, cb);
  }

  function renameFolder(id, name, cb) {
    var n = String(name || '').trim().slice(0, 80);
    if (!n || !id) {
      if (cb) cb(false);
      return;
    }
    update(function (s) {
      for (var i = 0; i < s.folders.length; i++) {
        if (s.folders[i].id === id) s.folders[i].name = n;
      }
      return s;
    }, cb);
  }

  function removeFolder(id, cb) {
    if (!id) {
      if (cb) cb(false);
      return;
    }
    update(function (s) {
      s.folders = s.folders.filter(function (f) {
        return f.id !== id;
      });
      Object.keys(s.assignments).forEach(function (nid) {
        if (s.assignments[nid] === id) delete s.assignments[nid];
      });
      return s;
    }, cb);
  }

  function setAssignment(notebookId, folderId, cb) {
    var nid = String(notebookId || '').trim();
    if (!nid) {
      if (cb) cb(false);
      return;
    }
    update(function (s) {
      if (!folderId) delete s.assignments[nid];
      else s.assignments[nid] = String(folderId);
      return s;
    }, cb);
  }

  global.ScholarNotebookFolderStore = {
    STORAGE_KEY: STORAGE_KEY,
    NOTEBOOK_SNAPSHOT_KEY: NOTEBOOK_SNAPSHOT_KEY,
    NOTEBOOK_TITLE_OVERRIDES_KEY: NOTEBOOK_TITLE_OVERRIDES_KEY,
    getState: getState,
    saveState: saveState,
    update: update,
    normalize: normalize,
    addFolder: addFolder,
    renameFolder: renameFolder,
    removeFolder: removeFolder,
    setAssignment: setAssignment,
  };
})(typeof window !== 'undefined' ? window : self);
