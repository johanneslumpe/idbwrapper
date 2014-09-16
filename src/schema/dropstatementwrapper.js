/* jslint node:true */
'use strict';

/**
 * Wrapper for drop/delete-related statements
 */
var DropStatementWrapper = function (db) {
  this._db = db;
};

/**
 * Deletes the passed in store
 * @param  {String} store The store to delete
 */
DropStatementWrapper.prototype.dropStore = function (store) {
  try {
    this._db.deleteObjectStore(store);
  } catch (e) {
    console.warn('store "' + store + '" not found', e);
  }
};

module.exports = DropStatementWrapper;
