'use strict';
/* global IDBDatabase:true, indexedDB: true */

describe('Base', function () {
  var expect = require('chai').expect;
  var TESTDB = 'idbwrapper_integration_test';
  var IDBWrapper = require('../../src/idbwrapper');

  var idb;

  before(function () {
    idb = IDBWrapper.initialize(TESTDB, 1);

    return idb.open();
  });

  after(function (done) {
    idb._database.close();

    var req = indexedDB.deleteDatabase(TESTDB);
    req.onsuccess = function () {
      done();
    };
  });

  it('connects to the database', function () {
    expect(idb._database).to.be.instanceof(IDBDatabase);
    expect(idb._database.name).to.equal(TESTDB);
  });

});
