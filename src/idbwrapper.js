/* jslint node:true  */
/* global Promise: true, indexedDB: true */
'use strict';

var Schema = require('./schema/schema');
var QueryWrapper = require('./querywrapper');
var TransactionWrapper = require('./transactionwrapper');
var removeListeners = require('./helpers/removelisteners');
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

  this._connectionPromise = new Promise(function (resolve, reject) {
    var initialReq = indexedDB.open(this._databaseName, this._version);

    initialReq.onsuccess = function (e) {
      this._database = e.target.result;
      this._defineStoreAccessors(this._database);
      resolve(this);
      removeListeners(e.target);
    }.bind(this);

    initialReq.onerror = function (e) {
      reject(new Error(e.target.error.message));
      removeListeners(e.target);
    };
    initialReq.onupgradeneeded = this._onUpgradeNeeded.bind(this);
  }.bind(this));


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
  var db = e.target.result;
  var transaction = e.target.transaction;
  this.schema.runDDLStatements(db, transaction, e.oldVersion, e.newVersion);
  // TODO: clear schema ddl statements here?
};

/**
 * Adds data to the store
 * @param  {String} store The store name
 * @param  {Array} values      An array of values to insert
 * @return {Object}            A promise
 */
IDBWrapper.prototype.insert = function (store, values) {
  var q = new QueryWrapper(store, this._connectionPromise);
  return q.insert(values);
};

/**
 * Either inserts or updates the passed in values
 * @param  {String} store The store name
 * @param  {Array} values      And array of values to upsert
 * @return {Object}            A promise
 */
IDBWrapper.prototype.upsert = function (store, values) {
  var q = new QueryWrapper(store, this._connectionPromise);
  return q.upsert(values);
};

/**
 * Find a single value from a store by key
 * @param  {String} store The store name
 * @param  {Mixed} key         The key value
 * @param  {Boolean} required  Whether the promise will be rejected for an empty result
 * @return {Promise}           A promise
 */
IDBWrapper.prototype.findByKey = function (store, key, required) {
  var q = new QueryWrapper(store, this._connectionPromise);
  return q.find(key, required);
};

/**
 * Exports the selected stores as a nested javascript object
 * @param  {Array} stores The stores to export, optional
 * @return {Object}       A promise which resolves with a javascript object holding the exported data
 */
IDBWrapper.prototype.export = function (stores) {
  stores = stores || this._availableStores;
  var selects = stores.map(function (store) {
    return this[store].findAll();
  }.bind(this));

  return Promise
  .all(selects)
  .then(function (results) {
    return stores.reduce(function (finalResult, store, index) {
      finalResult[store] = results[index];
      return finalResult;
    }, {});
  });
};

/**
 * Imports data from a javascript object or json string
 * @param  {Mixed} data A javascript object or JSON string
 * @return {Object}     A promise
 */
IDBWrapper.prototype.import = function (data) {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  var stores = Object.keys(data);
  if (!stores.every(function (store) {
    return this._availableStores.indexOf(store) !== -1;
  }.bind(this))) {
    return Promise.reject(new Error('Import data contains data for non-existing stores'));
  }
  // TODO: handle all inserts in a single transaction
  // to prevent partial imports
  var upserts = stores.map(function (store) {
    return this[store].upsert(data[store]);
  }.bind(this));

  return Promise.all(upserts);
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
