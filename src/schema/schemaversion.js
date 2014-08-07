/* jslint node:true */
'use strict';

/**
 * Wrapper which contains DDL statements for a schema version
 * @param {Function} callback The callback containing the changes
 */
var SchemaVersion = function (callback) {
  this._create = [];
  this._alter = [];
  this._drop = [];
};

// create DDL methods on the prototype
var methods = ['create', 'alter', 'drop'];
methods.forEach(function (cmd) {
  SchemaVersion.prototype[cmd + 'Table'] = function (tableName, callback, storeConfig) {
    this['_' + cmd].push({
      tableName: tableName,
      config: storeConfig,
      cb: callback
    });
    return this;
  };
});

module.exports = SchemaVersion;