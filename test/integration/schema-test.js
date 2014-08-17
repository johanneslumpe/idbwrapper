'use strict';
/* global indexedDB: true */

describe('Schema', function () {
  var expect = require('chai').expect;
  var TESTDB = 'idbwrapper_integration_test';
  var TESTDB_VERSION = 3;
  var IDBWrapper = require('../../src/idbwrapper');

  var idb;

  var compareDB;

  before(function (done) {
    idb = IDBWrapper.initialize(TESTDB, 3);
    idb.schema.registerVersion(1, function () {

      this.createTable('teststore', function () {
        this.addIndex('someindex');
        this.addIndex('a.nested.index');
      }, {keyPath: 'mykeypath'});

      this.createTable('anotherteststore', function () {
        this.addIndex('anotherindex');
      });

      this.createTable('autoincrementingstore', function () {

      }, {autoIncrement: true});

      this.createTable('storetoalter', function () {
        this.addIndex('test');
      });
      this.createTable('storetodrop');
    });

    idb.schema.registerVersion(2, function () {
      this.alterTable('storetoalter', function () {
        this.deleteIndex('test');
        this.addIndex('newindex');
      });
    });

    idb._schema.registerVersion(3, function () {
      this.dropTable('storetodrop', function () {
        this.dropTable('storetodrop');
      });
    });

    return idb.open()
    .then(function () {
      var req = indexedDB.open(TESTDB, TESTDB_VERSION);

      req.onsuccess = function (e) {
        compareDB = e.target.result;
        done();
      };
    });
  });

  after(function (done) {
    idb._database.close();
    compareDB.close();

    var req = indexedDB.deleteDatabase(TESTDB);
    req.onsuccess = function () {
      done();
    };
  });

  it('processes the create statements', function () {
    var stores = compareDB.objectStoreNames;

    expect(stores.contains('teststore')).to.be.ok;
    expect(stores.contains('anotherteststore')).to.be.ok;
    expect(stores.contains('autoincrementingstore')).to.be.ok;
  });

  it('processes the alter statements', function () {
      var tx = compareDB.transaction(['storetoalter'], 'readonly');

      var storetoalter = tx.objectStore('storetoalter');
      expect(storetoalter.indexNames.length).to.equal(1);
      expect(storetoalter.indexNames.contains('newindex')).to.be.ok;
  });

  it('processes the drop statements', function () {
    var stores = compareDB.objectStoreNames;

    expect(stores.contains('storetodrop')).to.not.be.ok;
  });

  it('adds the specified indexes to the tables', function () {
    var tx = compareDB.transaction(['teststore', 'anotherteststore', 'autoincrementingstore'], 'readonly');

    var teststore = tx.objectStore('teststore');
    expect(teststore.indexNames.contains('someindex')).to.be.ok;
    expect(teststore.indexNames.contains('a.nested.index')).to.be.ok;

    var anotherteststore = tx.objectStore('anotherteststore');
    expect(anotherteststore.indexNames.contains('anotherindex')).to.be.ok;

    var autoincrementingstore = tx.objectStore('autoincrementingstore');
    expect(autoincrementingstore.indexNames.length).to.equal(0);
  });

  it('properly forwards the passed in config', function () {
    var tx = compareDB.transaction(['teststore', 'anotherteststore', 'autoincrementingstore'], 'readonly');

    var teststore = tx.objectStore('teststore');
    expect(teststore.keyPath).to.equal('mykeypath');
    expect(teststore.autoIncrement).to.be.false;

    var anotherteststore = tx.objectStore('anotherteststore');
    expect(anotherteststore.keyPath).to.be.null;
    expect(anotherteststore.autoIncrement).to.be.false;

    var autoincrementingstore = tx.objectStore('autoincrementingstore');
    expect(autoincrementingstore.keyPath).to.be.null;
    expect(autoincrementingstore.autoIncrement).to.be.true;
  });

});
