/* jslint node:true  */
/* global IDBKeyRange: true, Promise: true */
'use strict';

/**
 * Stores all query options and compiles a query
 * @param {String} store The store to query
 */
var QueryWrapper = function (store, owningInstanceConnectionPromise) {
  this._storename = store;
  this._connectionPromise = owningInstanceConnectionPromise;

  this._findKey = null;

  this._queryType = null;
  this._tranctionMode = QueryWrapper.transactionMode.READONLY;
};

QueryWrapper.transactionMode = {
  READONLY: 'readonly',
  READWRITE: 'readwrite'
};

QueryWrapper.queryTypes = {
  FIND: 'FIND',
  FINDALL: 'FINDALL',
  INSERT: 'INSERT',
  UPSERT: 'UPSERT',
  REMOVE: 'REMOVE',
  COUNT: 'COUNT'
};

QueryWrapper.prototype._execute = function () {
  var p = this._connectionPromise;
  var method;

  switch(this._queryType) {
    case QueryWrapper.queryTypes.FIND:
      method = this._find.bind(this);
      break;
    case QueryWrapper.queryTypes.FINDALL:
      method = this._findAll.bind(this);
      break;
    case QueryWrapper.queryTypes.INSERT:
      method = this._insert.bind(this);
      break;
    case QueryWrapper.queryTypes.UPSERT:
      method = this._upsert.bind(this);
      break;
    case QueryWrapper.queryTypes.REMOVE:
      method = this._remove.bind(this);
      break;
    case QueryWrapper.queryTypes.COUNT:
      method = this._count.bind(this);
      break;             
  }

  if (method) {
    return p.then(function (idb) {
      return idb._database.transaction([this._storename], this._tranctionMode);
    }.bind(this))
    .then(method);
  }

  throw new Error('No valid method has been selected, this query will not produce anything');
};

// add then and catch methods to the prototype,
// so they can be used to kick of execution of 
// the query
['then', 'catch'].forEach(function (method) {
  QueryWrapper.prototype[method] = function () {
    var promise = this._execute();
    return promise[method].apply(promise, arguments);
  };
});

QueryWrapper.prototype._setQueryTypeAndTransactionMode = function (type) {

  if (!QueryWrapper.queryTypes[type]) {
    throw new Error('trying to set invalid query type: ' + type);
  }

  if (this._queryType) {
    console.warn('query type was already set to "' + this._queryType + '". Did you really want to change it?');
  }

  // update transaction mode based on the action
  var transactionMode = QueryWrapper.transactionMode.READONLY;
  switch(type) {
    case QueryWrapper.queryTypes.INSERT:
    case QueryWrapper.queryTypes.UPSERT:
    case QueryWrapper.queryTypes.REMOVE:
      transactionMode = QueryWrapper.transactionMode.READWRITE;
      break;
  }
  this._tranctionMode = transactionMode;

  this._queryType = type;
};

/**
 * Executes a baic find statement
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._find = function (tx) {
  var storename = this._storename;
  var key       = this._findKey;
  var required  = this._findRequired;
  var p         = Promise.defer();
  var store     = tx.objectStore(storename);

  if (!store) {
    p.reject(new Error('no such object store'));
  }
  
  var req = store.get(key);

  req.onsuccess = function (e) {
    if (required && e.target.result === undefined) {
      return p.reject(new Error('No item found for key "' + key + '"'));
    }
    p.resolve(e.target.result);
  };

  req.onerror = function (e) {
    p.reject(e.target.error.message);
  };

  return p.promise;  

};

/**
 * Finds all items in collection/store/table
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._findAll = function (tx) {
  var storename = this._storename;
  var store     = tx.objectStore(storename);
  var p = Promise.defer();

  if (!store) {
    p.reject(new Error('no such object store'));
  }

  var results = [];
  var cursor = store.openCursor();

  cursor.onsuccess = function (e) {
    var cursor = e.target.result;
    if (cursor) {
      results.push(cursor.value);
      cursor.continue();
    } else {
      p.resolve(results);
    }
  };

  cursor.onerror = function (e) {
    p.reject(new Error(e.target.error.message));
  };

  return p.promise;
};

/**
 * Inserts data into the store
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._insert = function (tx) {
  var storename     = this._storename;
  var insertedData  = [];
  var p             = Promise.defer();
  var transaction   = tx;
  
  var resolve = function () {
    p.resolve(insertedData);
  };

  var reject = function (e) {
    p.reject(new Error(e.target.error.message));
  };

  // transaction.onerror = function (e) {
  //   p.reject(new Error(e.target.error.message));
  // };

  // transaction.oncomplete = function (e) {
  //   p.resolve(insertedData);
  // };

  var store = transaction.objectStore(storename);
  var totalItemCount = this._values.length;
  var insertedItemCount = 0;
  this._values.forEach(function (item) {
    var req = store.add(item);
    req.onsuccess = function (e) {
      // e.target.result contains the key value
      // insertedData.push(e.target.result);
      insertedData.push(item);
      insertedItemCount++;

      if (insertedItemCount === totalItemCount) {
        resolve();
      }
    };

    req.onerror = function (e) {
      reject(e);
    };
  });

  return p.promise;
};

/**
 * Upserts data into the store
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._upsert = function (tx) {
  var storename     = this._storename;
  var insertedData  = [];
  var p             = Promise.defer();
  var transaction   = tx;

  var resolve = function () {
    p.resolve(insertedData);
  };

  var reject = function (e) {
    e = e instanceof Error ? e : new Error(e.target.error.message);
    p.reject(e);
  };
  var store = transaction.objectStore(storename);
  var totalItemCount = this._values.length;
  var insertedItemCount = 0;
  this._values.forEach(function (item) {
    try {
      var req = store.put(item);
      req.onsuccess = function (e) {
        // e.target.result contains the key value
        // insertedData.push(e.target.result);
        insertedData.push(item);
        insertedItemCount++;

        if (insertedItemCount === totalItemCount) {
          resolve();
        }
      };

      req.onerror = function (e) {
        reject(e);
      };
    } catch (e) {
      console.log('ERROR',e);
      transaction.abort();
      reject(e);
    }
  });

  return p.promise;
};

/**
 * Executes a remove query
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._remove = function (tx) {
  var storename = this._storename;
  var p   = Promise.defer();
  var req = tx.objectStore(storename).delete(this._deleteKey);

  req.onerror = function (e) {
    p.reject(e.target.error.message);
  };

  req.onsuccess = function (e) {
    p.resolve(true);
  };

  return p.promise;
};

/**
 * Executes a count query
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._count = function (tx) {
  var storename = this._storename;
  var index = this._countIndex;
  var p     = Promise.defer();
  var store = tx.objectStore(storename);

  var req;
  if (index) {
    if (!store.indexNames.contains(index)) {
      p.reject(new Error('The index "' + index + '" does not exist'));
    }
    req = store.index(index).count();

  } else {
    req = store.count();
  }

  req.onsuccess = function (e) {
    p.resolve(e.target.result);
  };

  req.onerror = function (e) {
    p.reject(e.target.error.message);
  };

  return p.promise;
};

/**
 * Prepares a findAll query
 * @return {Object} The QueryWrapper instance
 */
QueryWrapper.prototype.findAll = function () {
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.FINDALL);
  return this;
};

/**
 * Sets variables for a basic find
 * @param  {Mixed}    key     The key value to search for
 * @param  {Boolean} required If the promise should be rejected if no value is found
 * @return {Object}           The QueryWrapper istance
 */
QueryWrapper.prototype.find = function (key, required) {
  // guard against empty key
  var keyIsValid = typeof key === 'string' ||
                   typeof key === 'number' ||
                   key instanceof IDBKeyRange ||
                   Array.isArray(key);
  if (!keyIsValid) {
    console.warn('The key "' + key + '" is not valid for a find query');
  }

  this._findKey = keyIsValid ? key : '';
  this._findRequired = required;
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.FIND);
  return this;
};

/**
 * Prepares an insert
 * @param  {Array} values  The values to insert
 * @return {Object}        The QueryWrapper instance
 */
QueryWrapper.prototype.insert = function (values) {
  if (!Array.isArray(values)) {
    throw new Error('insert expects an array of values');
  }
  this._values = values;
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.INSERT);
  return this;
};

/**
 * Prepares an upsert query
 * @param  {Array} values  The values to insert or update
 * @return {Object}        The QueryWrapper instance
 */
QueryWrapper.prototype.upsert = function (values) {
  if (!Array.isArray(values)) {
    throw new Error('upsert exepcts an array of values');
  }
  this._values = values;
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.UPSERT);
  return this;
};

/**
 * Prepares a count query
 * @param  {String} index The index to count, optional
 * @return {Object}       The QueryWrapper instance
 */
QueryWrapper.prototype.count = function (index) {
  this._countIndex = index;
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.COUNT);
  return this;
};

/**
 * Prepares a remove/delete query
 * @param  {Mixed} key  The key of the item to be removed
 * @return {Object}     The QueryWrapper instance
 */
QueryWrapper.prototype.remove = function (key) {
  var keyIsValid = typeof key === 'string' ||
                   typeof key === 'number' ||
                   key instanceof IDBKeyRange;
  if (!keyIsValid) {
    throw new Error('The key "' + key + '" is not valid for a remove query');
  }
  this._deleteKey = key;
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.REMOVE);
  return this;
};

module.exports = QueryWrapper;
