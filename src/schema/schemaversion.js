/* jslint node:true */
'use strict';

/**
 * Wrapper which contains DDL statements for a schema version
 */
var SchemaVersion = function () {
  this._create = [];
  this._alter = [];
  this._drop = [];
};

// create DDL methods on the prototype
var methods = ['create', 'alter', 'drop'];
methods.forEach(function (cmd) {
  SchemaVersion.prototype[cmd + 'Store'] = function (storeName, callback, storeConfig) {
    this['_' + cmd].push({
      storeName: storeName,
      config: storeConfig,
      cb: callback
    });
    return this;
  };
});

module.exports = SchemaVersion;
