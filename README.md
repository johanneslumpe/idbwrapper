# IDB-Wrapper
An ongoing effort to create a promise-based api for indexedDB with an api, which I personally like.
This project exists because I wanted a wrapper, that suited my needs, which I could shape in whatever
way I see fit.

This project is its infancy and resembles my first try at writing a useful wrapper.

**There are currently no unit tests, but there will be eventually.**

This wrapper isn't meant to bridge the gap between different indexedDB implementations.
It is meant to be used on modern browsers which implement the current specification.

Last but not least: sorry for the sloppy docs. I will update them when I have some time.

# API

##IDB-Wrapper

##### IDBWrapper(database, version)
Constructor to create a new instance
* database - The name of the database to open
* version - The version that should be opened

#### Class methods

##### initialize(database, version)
Static convenience method to construct a new instance of `IDBWrapper`
without having to use `new`.

### Instance methods
##### open(closeAndReopen)
Opens a new database connection to the database specified when constructing the instance.
If a connection is already opened it will be returned else a new one will be opened.
If passing true the current connection will be closed and re-opened.

In case a higher database version then currently use is specified, `open` will
try to run all migrations up to the current version, which have been specified using `schema.registerVersion`. See below for more info.
* closeAndReopen - Should the current connection be closed and re-opened?
(Useful for updating the schema)

##### transaction([stores], callback)
Creates a transaction for the passed in stores, which then can be used inside
the provided callback
* stores - The stores to be used in the transaction
* callback - A callback which contains the statements to be executed inside
  the transaction

Example:
```javascript
idb.transaction(['somestore'], function (tx) {
  return tx.somestore.count()
  .then(function (result) {
    console.log(result);
  }).then(function () {
    return tx.somestore.insert([{hash:'567567567'}]);
  })
  .then(function () {
    throw new Error('BOOM');
  })
})
.then(function () {
  console.log('all good');
})
.catch(function (e) {
  // error but nothing has been committed
  console.log(':( error:', e);
})
```
________
The following methods currently exists, but might be removed later, as they aren't
neccessary, as all these methods can be directly call on the defined store properties.
They are useful though, if you want to operate on your store, before the database connection
has been opened and before the store-properties have been defined.
##### insert(store, [values])
Inserts `values` into `store`

##### upsert(store,[values])
Upserts `values` into `store`

##### findByKey(store, key, required)
Finds a record in `store` whose key matches `key`.
If `required` is specified, the returned promise will be rejected if no value is found.

Example
```javascript
idb.insert('storename', [{
  some: 'data'
}])
.then(function (inserted) {
  // will log the inserted object
  console.log('inserted', inserted);
})
.catch(function (e) {
  console.log('error', e);
});
```
#### Instance properties

##### schema
Returns an instance of `Schema`

QueryWrapper
====
A lazily-evaluating interface to query a table/store. Will be automatically instantiated
by an instance of `IDBWrapper`. All methods return a promise.

### Instance methods
##### find(key, required)
Tries to find a record for `key` inside the store which has been set on the `QueryWrapper`
If `required` is truthy, then the returned promise will be rejected if no value is found.
##### insert(values)
Inserts `values` into the `QueryWrapper`'s store. The returned promise will be rejected
if you try to insert duplicates.
##### upsert(values)
Upserts `values` into the `QueryWrapper`'s store.
##### count(index)
Counts the records inside the `QueryWrapper`'s store. If you do not pass in `index`,
all records inside the store will be counted. If you pass in a valid indexname, only
the records inside the index will be counted.
##### remove(key)
Removes the record whose keyPath matches `key` from the store.
Schema
====
This object holds all migrations which should be performed upon connecting to the database
### Instance methods

#####registerVersion(version, callback)
Registers and associates a schema `version` with the provided `callback`.

#####runDDLStatements(db, transaction, oldVersion, newVersion)
Runs all registered migrations during the `onupgradeneeded` event.
This method is automatically called by `IDB-Wrapper`.

SchemaVersion
====
A wrapper which provides an interface for running migrations on the object stores.
You do not have to instantiate a `SchemaVersion` manually. `Schema` takes care of this
for you.
### Instance methods

#####createTable(tableName, callback, config)
Creates a table/store with the name `tableName`, which can be configured in `callback`.
`config` is a config object which will be directly passed to the underlying `createObjectStore`
function.

#####alterTable(tableName, callback)
Allows your to alter the store named `tableName` inside of `callback`.

#####dropTable(tableName, callback)
Allows your to drop the store named `tableName` inside of `callback`.

An example:
```javascript
idb.schema
.registerVersion(1, function () {
  // the callback is always called
  // with the wrapper as context
  this.createTable('mystore', function () {
    this.addIndex('someindex');
    this.addIndex('a.nested.index');
  }, {keyPath: 'mykeypath'})
  .alterTable('existingstore', function () {
    this.deleteIndex('oldindex');
    this.addIndex(['new', 'compound']);
  })
  .dropTable('stuff', function () {
    // currently needs to explicitly dropped
    // inside the callback, will be changed
    this.dropTable('stuff');
  });
})
```
