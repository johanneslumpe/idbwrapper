/* jslint node:true  */
/* global IDBKeyRange: true, Promise: true */
'use strict';

var WhereConditionWrapper = require('./whereconditionwrapper');

/**
 * Stores all query options and compiles a query
 * @param {String} store The store to query
 */
var QueryWrapper = function (store, owningInstanceConnectionPromise, insideTransaction) {
  this._storename = store;
  this._connectionPromise = owningInstanceConnectionPromise;

  this._findKey = null;
  this._whereConditions = [];

  this._queryType = null;
  this._tranctionMode = QueryWrapper.transactionMode.READONLY;
  this._isInsideTransaction = !!insideTransaction;
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
  COUNT: 'COUNT',
  CLEAR: 'CLEAR'
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
    case QueryWrapper.queryTypes.CLEAR:
      method = this._clear.bind(this);
      break;
  }

  if (method) {
    var tx;
    var returnPromise = p.then(function (idb) {
      tx = idb._database.transaction([this._storename], this._tranctionMode);
      return tx;
    }.bind(this))
    .then(method);

    if (!this._isInsideTransaction) {
      returnPromise = returnPromise.then(function (result) {
        // we have to wait for the transaction to be completed
        // before the next chained statement can happen, in order
        // to guarantee that changed have been made, if we are
        // using separate transactions. actions made inside a single
        // transactions are consistent
        return new Promise(function (resolve, reject) {
          tx.oncomplete = function () {
            resolve(result);
          };
          tx.onerror = function (e) {
            reject(new Error(e.target.error.message));
          };
        });
      });
    } else {
      tx = null;
    }

    return returnPromise;
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

var createWhereConditionWrapperAndPushToStack = function (name, type, queryWrapper) {
  var condition = new WhereConditionWrapper(name, type, queryWrapper);
  queryWrapper._whereConditions.push(condition);
  return condition;
};


Object.defineProperty(QueryWrapper.prototype, 'where', {
  get: function () {
    var queryWrapper = this;
    return {
      index: function (indexName) {
        return createWhereConditionWrapperAndPushToStack(
          indexName,
          WhereConditionWrapper.conditionTypes.INDEX,
          queryWrapper
        );
      },

      field: function (fieldname) {
        return createWhereConditionWrapperAndPushToStack(
          fieldname,
          WhereConditionWrapper.conditionTypes.FIELD,
          queryWrapper
        );
      }
    };
  }
});

/**
 * Sets the query type and the according mode for the transaction
 */
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
    case QueryWrapper.queryTypes.CLEAR:
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
  var store     = tx.objectStore(storename);
  return new Promise(function (resolve, reject) {
    if (!store) {
      reject(new Error('no such object store'));
    }
    // TODO proper key handling
    if (key) {
      this._findForKey(store, key, resolve, reject);
    } else if(this._whereConditions.length) {
      this._findWithConditions(store, resolve, reject);
    } else {
      reject(new Error('neither key nor conditions specified'));
    }

  }.bind(this));
};

/**
 * Tries to find a record for a single key
 * @param  {IDBObjectStore} store The store to search in
 * @param  {Mixed} key            The key to search for
 * @param  {Object} promise       A deferred promise
 */
QueryWrapper.prototype._findForKey = function (store, key, resolve, reject) {
  var required  = this._findRequired;
  var req = store.get(key);

  req.onsuccess = function (e) {
    if (required && e.target.result === undefined) {
      return reject(new Error('No item found for key "' + key + '"'));
    }
    resolve(e.target.result);
  };

  req.onerror = function (e) {
    reject(e.target.error.message);
  };
};

/**
 * Tries to find a record based on where conditions
 * @param  {IDBObjectStore} store   The store to search in
 * @param  {Object} promise         A deferred promise
 */
QueryWrapper.prototype._findWithConditions = function (store, resolve, reject) {
  var indexCondition = getIndexCondition(this._whereConditions);
  // we only allow a single index condition for now
  indexCondition = indexCondition.length ? indexCondition[0] : false;
  var fieldConditions = getFieldConditions(this._whereConditions);
  // var searchObject = indexCondition ? store.index(indexCondition.getName()) : store;
  var searchObject;
  if (indexCondition) {
    var name = indexCondition.getName();
    searchObject = store.index(name);
  } else {
    searchObject = store;
  }
  // TODO: use either index or keypath condition
  var range = indexCondition ? indexCondition.getCondition() : null;

  // TODO: allow ordering (prev/next);
  var req = searchObject.openCursor(range, 'next');

  var results = [];
  req.onsuccess = function (e) {
    var cursor = e.target.result;
    if (cursor) {
      // TODO: maybe push an object containing key and primary key together
      // with the value?

      if (fieldConditions) {
        // TODO: cache comparators and condition names?!
        if (fieldConditions.every(function (condition) {
          return condition.getComparator()(cursor.value[condition.getName()]);
        })) {
          results.push(cursor.value);
        }
      } else {
        results.push(cursor.value);
      }
      e.target.result.continue();
    } else {
      console.log('no more data');
      // TODO: implement additional filtering and sorting here
      // should be done in a worker thread if possible
      resolve(results);
    }
  };

  req.onerror = function (e) {
    reject(new Error(e.target.error.message));
  };
};

/**
 * Helper to filter WhereConditionWrappers with type set to INDEX from an array
 * @param  {Array} arr The array to filter
 * @return {Array}     The resulting array of index conditions
 */
var getIndexCondition = function (arr) {
  return arr.filter(function (item) {
    return item.isType(WhereConditionWrapper.conditionTypes.INDEX);
  });
};

var getFieldConditions = function (arr) {
  return arr.filter(function (item) {
    return item.isType(WhereConditionWrapper.conditionTypes.FIELD);
  });
};

/**
 * Finds all items in collection/store/table
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._findAll = function (tx) {
  var storename = this._storename;
  var store     = tx.objectStore(storename);

  return new Promise(function (resolve, reject) {
    if (!store) {
      reject(new Error('no such object store'));
    }

    var results = [];
    var cursor = store.openCursor();

    cursor.onsuccess = function (e) {
      var cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    cursor.onerror = function (e) {
      reject(new Error(e.target.error.message));
    };

  });
};

/**
 * Handles both insert an upsert statements
 * for both batch and key insert/upserts
 * @param  {IDBTransaction} tx The transaction
 * @return {Object}            A Promise
 */
var _handleInsertUpsert = function (tx) {
  var storename     = this._storename;
  var insertedData  = [];
  var transaction   = tx;
  var key           = this['_' + this._queryType.toLowerCase() + 'Key'];
  var insertedItemCount = 0;
  var totalItemCount;
  var method = this._queryType === QueryWrapper.queryTypes.INSERT ?
               'add' :
               'put';

  var store = transaction.objectStore(storename);
  return new Promise(function (resolve, reject) {
    var storeMethod = function (item) {
      var req = key ?
                store[method](item, key) :
                store[method](item);

      req.onsuccess = function (e) {
        insertedData.push(item);
        insertedItemCount++;
        if (insertedItemCount === totalItemCount) {
          resolve(insertedData);
        }
      };

      req.onerror = function (e) {
        // TODO: create error subclasses for these
        reject(e.target.error);
      };
    };

    // if a key is provided, then the value should be inserted
    // as-is without trying to loop through it
    // TODO: proper key check
    if (key != null) {
      totalItemCount = 1;
      storeMethod(this._values);
    } else {
      totalItemCount = this._values.length;
      this._values.forEach(storeMethod);
    }

  }.bind(this));
};

/**
 * Inserts data into the store
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._insert = function (tx) {
  return _handleInsertUpsert.call(this, tx);
};

/**
 * Upserts data into the store
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._upsert = function (tx) {
  return _handleInsertUpsert.call(this, tx);
};


var _handleRemoveClear = function (tx) {
  var storename = this._storename;
  var method    = this._queryType === QueryWrapper.queryTypes.REMOVE ?
                  'delete' :
                  'clear';

  return new Promise(function (resolve, reject) {
    // we can just pass in the key to both methods, as it will
    // just be ignored for clear
    var req = tx.objectStore(storename)[method](this._deleteKey);

    req.onerror = function (e) {
      reject(e.target.error.message);
    };

    req.onsuccess = function () {
      resolve(true);
    };
  }.bind(this));
};

/**
 * Executes a remove query
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._remove = function (tx) {
  return _handleRemoveClear.call(this, tx);
};

/**
 * Executes a clear query
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._clear = function (tx) {
  return _handleRemoveClear.call(this, tx);
};

/**
 * Executes a count query
 * @param  {IDBTransaction} tx A Transaction
 * @return {Object}            A promise
 */
QueryWrapper.prototype._count = function (tx) {
  var storename = this._storename;
  var index = this._countIndex;
  var store = tx.objectStore(storename);

  return new Promise(function (resolve, reject) {
    var req;
    if (index) {
      if (!store.indexNames.contains(index)) {
        reject(new Error('The index "' + index + '" does not exist'));
      }
      req = store.index(index).count();

    } else {
      req = store.count();
    }

    req.onsuccess = function (e) {
      resolve(e.target.result);
    };

    req.onerror = function (e) {
      reject(e.target.error.message);
    };

  });
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
 * Processes inserts and upserts
 * @param  {Mixed} values The values to insert
 * @param  {Mixed} key    The key to store the value in, optional
 * @param  {String} type  Whether we want to insert or upsert
 * @return {Object}       The QueryWrapper instance
 */
var handleInsertUpsert = function (values, key, type) {
  if (!Array.isArray(values) && !key) {
    throw new Error(type.toLowerCase() + ' expects an array of values');
  }

  this._values = values;
  this['_' + type.toLowerCase() + 'Key'] = key;
  this._setQueryTypeAndTransactionMode(type);

  return this;
};

/**
 * Prepares an insert
 * @param  {Array} values  The values to insert
 * @return {Object}        The QueryWrapper instance
 */
QueryWrapper.prototype.insert = function (values, key) {
  return handleInsertUpsert.call(this, values, key, QueryWrapper.queryTypes.INSERT);
};

/**
 * Prepares an upsert query
 * @param  {Array} values  The values to insert or update
 * @return {Object}        The QueryWrapper instance
 */
QueryWrapper.prototype.upsert = function (values, key) {
  return handleInsertUpsert.call(this, values, key, QueryWrapper.queryTypes.UPSERT);
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

/**
 * Prepares a clear query
 * @return {Object} The QueryWrapper instance
 */
QueryWrapper.prototype.clear = function () {
  this._setQueryTypeAndTransactionMode(QueryWrapper.queryTypes.CLEAR);
  return this;
};

module.exports = QueryWrapper;
