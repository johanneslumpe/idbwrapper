/* jslint node:true  */
/* global Promise: true */
'use strict';

var QueryWrapper = require('./querywrapper');

var TransactionWrapper = function (availableStores, callback, db) {
  this._availableStores = availableStores;
  this._transactionDeferred = Promise.defer();
  this._transactionPromise = this._transactionDeferred.promise;
  this._database = db;
  this._callback = callback;

  if (typeof callback !== 'function') {
    throw new Error('You need to pass in a callback for the transaction');
  }
  // var cbStr = callback.toString();
  // var wrapperVar = cbStr.match(TransactionWrapper.wrapperVarRegexp)[1];

  // availableStores.forEach(function (store) {
  //   // figure out which stores are going to be used and inject them
  //   var storeRegexp = new RegExp('('+ wrapperVar + '(?:\\.' +store + '\\.)|'+ wrapperVar + '(?:\\[\'' + store + '\'\\])|' + wrapperVar + '(?:\\["' + store + '"\\]))');
  //   if (storeRegexp.test(cbStr)) {
  //     this._storesToLoad.push(store);
  //   }
  // }, this);

  // generate transaction promise here
  // this._transaction = db.transaction(this._storesToLoad);

  availableStores.forEach(function (store) {
    Object.defineProperty(this, store, {
      enumerable:true,
      get: (function (store) {
        return function () {
          return new QueryWrapper(store, this._transactionPromise);
        };
      }(store))
    });
  }, this);
};

/**
 * Starts all actions by resolving the transaction promise
 */
TransactionWrapper.prototype.performTransaction = function () {
  // TODO: auto-determine whether to use readonly or readwrite
  var transaction = this._database.transaction(this._availableStores, 'readwrite');

  transaction.onerror = function (e) {
    console.log('TRANSACTION ERROR');
    try {
      // transaction might already have been aborted
      transaction.abort();
    } catch (e) {}
  };
  transaction.onabort = function (e) {
    console.log('TRANSACTION ABORT');
  };
  transaction.oncomplete = function (e) {
    console.log('TRANSACTION COMPLETE');
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
  .catch(function (e) {
    transaction.abort();
    throw e;
  });
};

module.exports = TransactionWrapper;
