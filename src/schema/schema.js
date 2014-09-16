/* jslint node:true */
'use strict';

var SchemaVersion = require('./schemaversion');
var CreateStatementWrapper = require('./createstatementwrapper');
var UpdateStatementWrapper = require('./updatestatementwrapper');
var DropStatementWrapper = require('./dropstatementwrapper');

/**
 * Schema builder
 */
var Schema = function () {
  this._versions = {};
};

/**
 * Stores a new schema for a specified version
 * @param  {Integer}   version  The version number
 * @param  {Function} callback The callback containing the updates
 * @return {Object}            The Schema instance
 */
Schema.prototype.registerVersion = function (version, callback) {
  var versionWrapper = new SchemaVersion();
  callback.call(versionWrapper);
  this._versions[version] = versionWrapper;
  return this;
};

/**
 * Runs all registered DDL statements
 * @param  {IDBDatabase} db             The database
 * @param  {IDBTransaction} transaction The version change event transaction
 */
Schema.prototype.runDDLStatements = function (db, transaction, oldVersion, newVersion) {
  var stores = {};

  var startingVersion = oldVersion + 1;
  var finalVersion = newVersion;

  var maybeCallCallback = function (store, wrapper) {
    var cb = store.cb;
    if (typeof cb === 'function') {
      cb.call(wrapper);
    }
  };

  var existingStores = db.objectStoreNames;
  for(var i = startingVersion; i <= finalVersion; i++) {
    var version = this._versions[i];
    if (!version) { continue; }
    console.log('Running migration for version '  + i);

    // process create statements
    version._create.forEach(function (store) {
      var storeName = store.storeName;

      if (existingStores.contains(storeName)) {
        console.warn('Store "' + storeName + '" already exists');
        stores[storeName] = transaction.objectStore(storeName);
        return;
      }

      var config = store.config || {};
      // create store
      var newStore = stores[storeName] = db.createObjectStore(storeName, config);

      // execute callback
      var wrapper = new CreateStatementWrapper(newStore);
      maybeCallCallback(store, wrapper);
    });

    // process alter statements
    version._alter.forEach(function (store) {
      var wrapper = new UpdateStatementWrapper(stores[store.storeName]);
      maybeCallCallback(store, wrapper);
    });

    // process drop statements
    version._drop.forEach(function (store) {
      var wrapper = new DropStatementWrapper(db);
      maybeCallCallback(store, wrapper);
    });
  }
};

module.exports = Schema;
