/* jslint node:true */
'use strict';

/**
 * Adds an index to the store
 * @param {String} index  The Index to add
 * @param {Object} config The index config
 */
var addStoreIndex = function (index, config) {
  var indexName = index;
  var indexFields = index;
  // config can be:
  // {unique: true, multiEntry: true}
  try {
    this._store.createIndex(indexName, indexFields, config);
  } catch (e) {
    console.warn('index "' + index + '" already exists');
  }
};

module.exports = addStoreIndex;