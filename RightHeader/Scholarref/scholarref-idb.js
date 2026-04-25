/**
 * ScholarRef용 IndexedDB (notebooklm.google.com 페이지 컨텍스트)
 */
(function () {
  'use strict';
  var DB_NAME = 'ScholarNotebookScholarRef';
  var DB_VERSION = 1;
  var db = null;

  function openDb() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = function () {
          reject(req.error || new Error('IDB open failed'));
        };
        req.onsuccess = function () {
          db = req.result;
          resolve(db);
        };
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains('scholar_refs')) {
            d.createObjectStore('scholar_refs', { keyPath: 'id' });
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  window.__scholarRefDbGetter = function () {
    return db;
  };
  window.__scholarRefDbReady = openDb().catch(function () {
    return null;
  });
})();
