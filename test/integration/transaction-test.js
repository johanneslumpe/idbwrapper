'use strict';
/* jslint maxlen: 200 */
/* global indexedDB: true */

describe('Transaction', function () {
  var expect = require('chai').expect;
  var TESTDB = 'idbwrapper_integration_test';
  var IDBWrapper = require('../../src/idbwrapper');

  var idb;

  var person = {
    id: 1,
    firstname: 'John',
    lastname: 'Doe',
    employer: 'ACME',
    age: '40'
  };

  var person2 = {
    id: 2,
    firstname: 'John',
    lastname: 'Doe',
    employer: 'ACME',
    age: '40'
  };


  before(function () {
    idb = IDBWrapper.initialize(TESTDB, 1);
    idb.schema.registerVersion(1, function () {
      this.createStore('teststore', function () {
        this.addIndex('lastname');
        this.addIndex('employer');
        this.addIndex('age');
      }, {keyPath: 'id'});
    });

    return idb.open();
  });

  after(function (done) {
    idb._database.close();

    var req = indexedDB.deleteDatabase(TESTDB);
    req.onsuccess = function () {
      done();
    };
  });

  afterEach(function (done) {
    var tx = idb._database
    .transaction(['teststore'], 'readwrite');

    var req = tx.objectStore('teststore').clear();

    tx.oncomplete = function () {
      done();
    };
  });

  it('runs all methods inside the callback', function () {
    return idb.transaction(function (tx) {
      return tx.teststore.insert([person])
      .then(function () {
        return tx.teststore.insert([person2]);
      });
    })
    .then(function () {
      return idb.teststore.count();
    })
    .then(function (count) {
      expect(count).to.equal(2);
    });
  });

  it('does not modify anything, if an error occurs inside the transaction', function () {
    return idb.transaction(function (tx) {
      return tx.teststore.insert([person])
      .then(function () {
        return tx.teststore.insert([person2]);
      })
      .then(function () {
        throw new Error('boom');
      });
    })
    .catch(function (e) {
      expect(e.message).to.equal('boom');
    })
    .then(function () {
      return idb.teststore.count();
    })
    .then(function (count) {
      expect(count).to.equal(0);
    });
  });

  it('returns the value with which the promise inside the callback resolves', function () {
    return idb.transaction(function (tx) {
      return tx.teststore.insert([person])
      .then(function () {
        return tx.teststore.insert([person2]);
      })
      .then(function () {
        return tx.teststore.findAll();
      });
    })
    .then(function (txResult) {
      expect(txResult).to.deep.equal([person, person2]);
    });
  });

});
