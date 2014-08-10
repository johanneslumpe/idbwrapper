/* jslint node:true  */
/* global Promise: true */
'use strict';

var QueryWrapper = require('./querywrapper');

/**
 * Wrapper for a transction
 * @param {Array}   availableStores The stores available for this transaction
 * @param {Function} callback       The callback with actions for this transaction
 * @param {IDBDatabase}   db        The database to run the transaction in
 * @param {Object}   options        A configuration object
 */
var TransactionWrapper = function (availableStores, callback, db, options) {
  options = options || {};
  this._availableStores = availableStores;
  this._database = db;
  this._callback = callback;
  this._transactionDeferred = Promise.defer();
  this._transactionPromise = this._transactionDeferred.promise;
  this._callbackResult = null;

  this._autoDetectUsedStores = !!options.autoDetectUsedStores;

  if (typeof callback !== 'function') {
    throw new Error('You need to pass in a callback for the transaction');
  }

  if (this._autoDetectUsedStores) {
    var cbStr = callback.toString();
    var wrapperVar = cbStr.match(TransactionWrapper.wrapperVarRegExp)[1];
    
    this._availableStores = availableStores.filter(function (store) {
      // figure out which stores are going to be used
      var access1 = wrapperVar + '(?:\\.' +store + '(?!\\w)[;\\.]?)';
      var access2 = wrapperVar + '(?:\\[\'' + store + '\'\\])';
      var access3 = wrapperVar + '(?:\\["' + store + '"\\])';
      var storeRegExp = new RegExp('('+ access1 + '|' + access2 + '|' + access3 + ')');

      return storeRegExp.test(cbStr);
    });
  }

  this._availableStores.forEach(function (store) {
    Object.defineProperty(this, store, {
      enumerable:true,
      get: (function (store) {
        return function () {
          return new QueryWrapper(store, this._transactionPromise, true);
        };
      }(store))
    });
  }, this);
};

TransactionWrapper.wrapperVarRegExp = /function[\s]*\([\s]?(\w+).*?\)/;

/**
 * Starts all actions by resolving the transaction promise
 */
TransactionWrapper.prototype.performTransaction = function () {
  // TODO: auto-determine whether to use readonly or readwrite
  var transaction = this._database.transaction(this._availableStores, 'readwrite');
  var successPromise = Promise.defer();

  var error;

  transaction.onerror = function (e) {
    console.log('TRANSACTION ERROR');
    error = e;
    try {
      // transaction might already have been aborted
      transaction.abort();
    } catch (e) {}
  };
  transaction.onabort = function () {
    console.log('TRANSACTION ABORT');
    successPromise.reject(error);
  };
  var self = this;
  transaction.oncomplete = function (e) {
    console.log('TRANSACTION COMPLETE');
    successPromise.resolve(self._callbackResult);
  };

  // inject a fake IDB object for now
  // TODO: solve this properly
  this._transactionDeferred.resolve({
    _database: {
      transaction: function (stores) {
        return transaction;
      }
    }
  });

  return this._transactionPromise
  .then(function (result) {
    return this._callback(this);
  }.bind(this))
  .then(function (result) {
    this._callbackResult = result;
  }.bind(this))
  .catch(function (e) {
    error = e;
    transaction.abort();
  }).then(function () {
    return successPromise.promise;
  });
};

module.exports = TransactionWrapper;
