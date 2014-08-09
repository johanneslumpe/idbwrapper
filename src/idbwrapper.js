/* jslint node:true  */
/* global Promise: true, indexedDB: true */
'use strict';

var Schema = require('./schema/schema');
var QueryWrapper = require('./querywrapper');
var TransactionWrapper = require('./transactionwrapper');

/**
 * Constructor for IDB-wrapper
 * @param {String} database  The database to open
 * @param {Integer} version  The database version
 */
var IDBWrapper = function IDBWrapper(database, version) {
  this._databaseName = database;
  this._version = version; 
  this._availableStores = []; 
  Object.defineProperty(this, 'schema', {
    get: function () {
      if (!this._schema) {
        this._schema = new Schema(this);
      }
      return this._schema;
    }
  });

  this.open();
};

/**
 * Opens  or closes and re-opens a database connection
 * @param  {Boolean} closeAndReopen Should the current connection be closed and re-opened?
 * @return {Object}                 A promise
 */
IDBWrapper.prototype.open = function (closeAndReopen) {
  if (this._connectionPromise && !closeAndReopen) {
    return this._connectionPromise;
  }
  if (this._database) {
    this._database.close();
  }

  var p = Promise.defer();
  this._connectionPromise = p.promise;

  var initialReq = indexedDB.open(this._databaseName, this._version);

  initialReq.onsuccess = function (e) {
    this._database = e.target.result;
    this._defineStoreAccessors(this._database);
    p.resolve(this);
  }.bind(this);

  initialReq.onerror = function (e) {
    p.reject(new Error(e.target.error.message));
  };
  initialReq.onupgradeneeded = this._onUpgradeNeeded.bind(this);

  return this._connectionPromise;
};

/**
 * Performs a transaction
 * @param  {Function} callback A callback performing the actions
 * @return {Object}            A promise
 */
IDBWrapper.prototype.transaction = function (stores,callback) {
  var transactionStores;
  var options = {};

  if (typeof stores !== 'function') {
    if (!Array.isArray(stores)) {
      throw new Error('Expecting an array of stores for the transaction');
    }
    transactionStores = stores.filter(function (store) {
      return this._availableStores.indexOf(store) !== -1; 
    }, this);

    if (!transactionStores.length) {
      throw new Error('No valid stores specified');
    }
  } else {
    // no stores have been specified, so we should auto detect them
    options.autoDetectUsedStores = true;
    transactionStores = this._availableStores;
    // only a callback was passed in, reassign variable
    callback = stores;
  }

  var wrapper = new TransactionWrapper(transactionStores, callback, this._database, options);
  return wrapper.performTransaction();
};

/**
 * Defines store accessors on the IDB instance 
 * @param  {IDBDatabase} db The database object
 */
IDBWrapper.prototype._defineStoreAccessors = function (db) {
  var existingStores = db.objectStoreNames;
  for (var i = 0, ii = existingStores.length; i< ii; i++) {
    var store = existingStores[i];
    this._availableStores.push(store);
    // these accessors will be only available AFTER connecting
    Object.defineProperty(this, store, {
      enumerable: true,
      configurable: true,
      get: (function (store) {
        return function () {
          return new QueryWrapper(store, this._connectionPromise);
        };
      }(store))
    });
  }
};

/**
 * Handles onupgradeneeded event
 * @param  {Object} e The event
 */
IDBWrapper.prototype._onUpgradeNeeded = function (e) {
  console.log(e);
  var db = e.target.result;
  var transaction = e.target.transaction;
  this.schema.runDDLStatements(db, transaction, e.oldVersion, e.newVersion);
  // TODO: clear schema ddl statements here?
};

/**
 * Adds data to the table/collection/store
 * @param  {String} collection The collection name
 * @param  {Array} values      An array of values to insert
 * @return {Object}            A promise
 */
IDBWrapper.prototype.insert = function (collection, values) {
  var q = new QueryWrapper(collection, this._connectionPromise);
  return q.insert(values);
};

/**
 * Either inserts or updates the passed in values
 * @param  {String} collection The collection name
 * @param  {Array} values      And array of values to upsert
 * @return {Object}            A promise
 */
IDBWrapper.prototype.upsert = function (collection, values) {
  var q = new QueryWrapper(collection, this._connectionPromise);
  return q.upsert(values);
};

/**
 * Find a single value from a collection by key
 * @param  {String} collection The collection name
 * @param  {Mixed} key         The key value
 * @param  {Boolean} required  Whether the promise will be rejected for an empty result
 * @return {Promise}           A promise
 */
IDBWrapper.prototype.findByKey = function (collection, key, required) {
  var q = new QueryWrapper(collection, this._connectionPromise);
  return q.find(key, required);
};

/**
 * Convenience method to construct a new instance
 * @param  {String} database  The database to open
 * @param  {Integer} version  The database version
 * @return {Object}           A new instance
 */
IDBWrapper.initialize = function (database, version) {
  return new IDBWrapper(database, version);
};

module.exports = IDBWrapper;