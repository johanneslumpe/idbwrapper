/* jslint node:true */
'use strict';

var CommonStatementWrapper = require('./commonstatementwrapper');
var addStoreIndex = require('./helpers/addstoreindex');

/**
 * A wrapper for create-related ddl statements
 */
var CreateStatementWrapper = function (store) {
  this._store = store;
};

CreateStatementWrapper.prototype = new CommonStatementWrapper();
CreateStatementWrapper.prototype.addIndex = addStoreIndex;

module.exports = CreateStatementWrapper;