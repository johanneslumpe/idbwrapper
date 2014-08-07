/* jslint node:true */
'use strict';

/**
 * Base class to encapsulate common store statements
 */
var CommonStatementWrapper = function () {};

/**
 * Get a list of indexes
 * @return {DOMStringList} The list of indexes for the store
 */
CommonStatementWrapper.prototype.getIndexes = function () {
  return this._store.indexNames;
};

/**
 * Get the store name
 * @return {String} The name
 */
CommonStatementWrapper.prototype.getName = function () {
  return this._store.name;
};

/**
 * Determine whether the store uses and autoincrement key
 * @return {Boolean} Uses autoincrement key?
 */
CommonStatementWrapper.prototype.isAutoIncrement = function () {
  return this._store.autoIncrement;
};


module.exports = CommonStatementWrapper;