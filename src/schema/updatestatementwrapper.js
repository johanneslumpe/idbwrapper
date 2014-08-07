/* jslint node:true */
'use strict';

var CommonStatementWrapper = require('./commonstatementwrapper');
var addStoreIndex = require('./helpers/addstoreindex');

/**
 * Wrapper for update-related ddl statements
 */
var UpdateStatementWrapper = function (store) {
  this._store = store;
};

UpdateStatementWrapper.prototype = new CommonStatementWrapper();
UpdateStatementWrapper.prototype.addIndex = addStoreIndex;

/**
 * Deletes an index on a store
 * @param  {String} index The index to delete
 */
UpdateStatementWrapper.prototype.deleteIndex = function (index) {
  try {
    this._store.deleteIndex(index);
  } catch (e) {
    console.warn('index "' + index + '" not found', e);
  }
};

module.exports = UpdateStatementWrapper;

