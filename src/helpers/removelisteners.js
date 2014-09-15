'use strict';

/**
 * Takes an object and nullifies the error and success
 * listeners. This is done because it seems like that
 * listeners for IDBRequest objects are not properly cleaned
 * up in chrome and stay around even after the IDBRequest
 * instance goes out of scope. Forcing a GC cycle does not
 * help so in order to prevent this we actively remove
 * our listeners
 */
var removeListeners = function removeListeners(req) {
  req.onsuccess = null;
  req.onerror = null;
  req.oncomplete = null;
  req.onupgradeneeded = null;
};

module.exports = removeListeners;
