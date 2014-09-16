'use strict';
/* jslint maxlen: 200 */
/* global indexedDB: true */

describe('Data import/export', function () {
  var expect = require('chai').expect;
  var TESTDB = 'idbwrapper_integration_test';
  var IDBWrapper = require('../../src/idbwrapper');

  var idb;

  before(function () {
    idb = IDBWrapper.initialize(TESTDB, 1);
    idb.schema.registerVersion(1, function () {

      this.createStore('teststore', function () {}, {keyPath: 'id'});
      this.createStore('anotherteststore', function () {}, {keyPath: 'id'});
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

  var data = {
    'teststore': [{
      id:1,
      name: 'John'
    },{
      id:2,
      name: 'Paul'
    },{
      id:3,
      name: 'George'
    },{
      id:4,
      name: 'Ringo'
    }],
    'anotherteststore': [{
      id:1,
      name: 'test1'
    },{
      id:2,
      name: 'test2'
    },{
      id:3,
      name: 'test3'
    }]
  };

  describe('import', function () {

    it('imports data into existing stores with keypath', function () {
      return idb.import(data)
      .then(function (result) {
        expect(result).to.be.an('Array');
        expect(result[0]).to.eql(data.teststore);
        expect(result[1]).to.eql(data.anotherteststore);
        return Promise.all([
          idb.teststore.count(),
          idb.anotherteststore.count()
        ]);
      })
      .then(function (counts) {
        expect(counts[0]).to.equal(4);
        expect(counts[1]).to.equal(3);
      });
    });

    it('throws an error if a non-existing store is found in the import-data', function () {
      return idb.import({'nonexisiting': []})
      .then(function () {
        // guard
        expect(true).to.equal(false);
      })
      .catch(function (e) {
        expect(e).to.be.ok;
        expect(e.message).to.match(/non-existing/i);
      });

    });

  });

  describe('export', function () {

    it('exports data out of all stores when no stores are passed as parameter', function () {
      return idb.export()
      .then(function (exportedData) {
        expect(exportedData).to.eql(data);
      });
    });

    it('exports only the selected stores when an array of stores is passed in', function () {
      var expectedResult = {
        teststore: data.teststore
      };

      return idb.export(['teststore'])
      .then(function (exportedData) {
        expect(exportedData).to.eql(expectedResult);
      });
    });

  });

});
