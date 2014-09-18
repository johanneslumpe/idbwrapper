/* jslint node:true  */
/* global Promise: true */
'use strict';

var QueryWrapper = require('./querywrapper');

/**
 * Wrapper for a transction
 * @param {Array}   availableStores The stores available for this transaction
 * @param {Function} callback       The callback for this transaction
 * @param {IDBDatabase}   db        The database to run the transaction in
 * @param {Object}   options        A configuration object
 */
var TransactionWrapper = function (availableStores, callback, db, options) {
  options = options || {};
  this._availableStores = availableStores;
  this._database = db;
  this._callback = callback;

  this._transactionPromise = new Promise(function (resolve) {
    this._txResolve = resolve;
  }.bind(this));

  this._callbackResult = null;

  this._autoDetectUsedStores = !!options.autoDetectUsedStores;

  if (typeof callback !== 'function') {
    throw new Error('You need to pass in a callback for the transaction');
  }

  if (this._autoDetectUsedStores) {
    this._availableStores = this._autodetectStores(callback, availableStores);
  }

  this._setupStores();
};

TransactionWrapper.wrapperVarRegExp = /function[\s]*\([\s]?(\w+).*?\)/;

/**
 * Parses the passed in callback for used stores and sets
 * the resulting array on the instance
 */
TransactionWrapper.prototype._autodetectStores = function (callback, stores) {
  var cbStr = callback.toString();
  var wrapperVar = cbStr.match(TransactionWrapper.wrapperVarRegExp)[1];

  return stores.filter(function (store) {
    // figure out which stores are going to be used
    var access1 = wrapperVar + '(?:\\.' + store + '(?!\\w)[;\\.]?)';
    var access2 = wrapperVar + '(?:\\[\'' + store + '\'\\])';
    var access3 = wrapperVar + '(?:\\["' + store + '"\\])';
    var storeRegExp = new RegExp('(' +
      access1 +
      '|' + access2 +
      '|' + access3 +
    ')');

    return storeRegExp.test(cbStr);
  });
};

/**
 * Sets all available stores as getter on the instance
 */
TransactionWrapper.prototype._setupStores = function () {
  this._availableStores.forEach(function (store) {
    Object.defineProperty(this, store, {
      enumerable: true,
      get: (function (store) {
        return function () {
          return new QueryWrapper(store, this._transactionPromise, true);
        };
      }(store))
    });
  }, this);
};

/**
 * Starts all actions by resolving the transaction promise
 */
TransactionWrapper.prototype.performTransaction = function () {
  var txResolve;
  var txReject;
  var txPromise = new Promise(function (resolve, reject) {
    txResolve = resolve;
    txReject = reject;
  });

  var error;

  // TODO: auto-determine whether to use readonly or readwrite
  var tx = this._database.transaction(this._availableStores, 'readwrite');

  tx.onerror = function (e) {
    txReject(e);
  };

  tx.onabort = function () {
    txReject(error);
  };

  var self = this;
  tx.oncomplete = function () {
    txResolve(self._callbackResult);
  };

  // inject a fake IDB object for now
  // TODO: solve this properly?!
  this._txResolve({
    _database: {
      transaction: function () {
        return tx;
      }
    }
  });

  // the problems seems to be that in firefox
  // transactions to not survive until the next tick
  // if no request is executed on them

  return this._callback(this)
  .then(function (result) {
    this._callbackResult = result;
  }.bind(this))
  .catch(function (e) {
    error = e;
    tx.abort();
  })
  .then(function () {
    return txPromise;
  });

};

module.exports = TransactionWrapper;
