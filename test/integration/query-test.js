'use strict';
/* jslint maxlen: 200 */
/* global indexedDB: true */

describe('Query', function () {
  var expect = require('chai').expect;
  var TESTDB = 'idbwrapper_integration_test';
  var TESTDB_VERSION = 1;
  var IDBWrapper = require('../../src/idbwrapper');

  var idb;
  var compareDB;

  before(function (done) {
    idb = IDBWrapper.initialize(TESTDB, 1);
    idb.schema.registerVersion(1, function () {

      this.createTable('teststore', function () {
        this.addIndex('firstname');
        this.addIndex('employer');
        this.addIndex('age');
      }, {keyPath: 'id'});
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

  describe('Inserting/modifying', function () {

    describe('insert', function () {

      afterEach(function (done) {
        var store = compareDB.transaction(['teststore'], 'readwrite').objectStore('teststore');
        store.clear().onsuccess = function () {
          done();
        };
      });

      it('inserts a single item into the store', function (done) {
        var person = {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          employer: 'ACME',
          age: '40'
        };

        idb.teststore
        .insert([person])
        .then(function (result) {
          expect(result).to.be.an('Array');
          expect(result[0]).to.equal(person);

          var store = compareDB.transaction(['teststore'], 'readonly').objectStore('teststore');
          var countReq = store.count();
          countReq.onsuccess = function (e) {
            expect(e.target.result).to.equal(1);

            var select = store.get(1);
            select.onsuccess = function (e) {
              expect(e.target.result).to.eql(person);
              done();
            };
          };
        });
      });

      it('inserts multiple items into the store', function (done) {
        var person = {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          employer: 'ACME',
          age: '40'
        };

        var person2 = {
          id: 2,
          firstname: 'Jack',
          lastname: 'Doe',
          employer: 'ACME',
          age: '42'
        };

        idb.teststore
        .insert([person, person2])
        .then(function (result) {
          expect(result).to.be.an('Array');
          expect(result[0]).to.equal(person);
          expect(result[1]).to.equal(person2);

          var store = compareDB.transaction(['teststore'], 'readonly').objectStore('teststore');
          var countReq = store.count();
          countReq.onsuccess = function (e) {
            var select1Done = false;
            var select2Done = false;

            var maybeDone = function () {
              if (select1Done && select2Done) {
                done();
              }
            };

            expect(e.target.result).to.equal(2);

            store.get(1).onsuccess = function (e) {
              expect(e.target.result).to.eql(person);
              select1Done = true;
              maybeDone();
            };

            store.get(2).onsuccess = function (e) {
              expect(e.target.result).to.eql(person2);
              select2Done = true;
              maybeDone();
            };
          };
        });
      });

      it('throws an error when the inserted object does not match the requirements of the store', function () {
        var personWithoutKeyPath = {
          firstname: 'Not',
          lastname: 'me'
        };

        return idb.teststore
        .insert([personWithoutKeyPath])
        .catch(function (e) {
          expect(e.name).to.equal('DataError');
        });
      });


      // this works fine in chrome but fails in firefox. it works without issues in firefox
      // in a normal development/production environment. excluding this for further investigation
      xit('throws an error when an object for the key already exists', function () {
        var person = {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          employer: 'ACME',
          age: '40'
        };

        var person2 = {
          id: 1,
          firstname: 'Jack',
          lastname: 'Doe',
          employer: 'ACME',
          age: '42'
        };

        return idb.teststore
        .insert([person, person2])
        .catch(function (e) {
          expect(e.name).to.equal('ConstraintError');
        });
      });

    });

    describe('upsert', function () {

      afterEach(function (done) {
        var store = compareDB.transaction(['teststore'], 'readwrite').objectStore('teststore');
        store.clear().onsuccess = function () {
          done();
        };
      });

      it('inserts a single item into the store of it does not exist', function (done) {
        var person = {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          employer: 'ACME',
          age: '40'
        };

        idb.teststore
        .upsert([person])
        .then(function (result) {
          expect(result).to.be.an('Array');
          expect(result[0]).to.equal(person);

          var store = compareDB.transaction(['teststore'], 'readonly').objectStore('teststore');
          var countReq = store.count();
          countReq.onsuccess = function (e) {
            expect(e.target.result).to.equal(1);

            var select = store.get(1);
            select.onsuccess = function (e) {
              expect(e.target.result).to.eql(person);
              done();
            };
          };
        });
      });

      it('updates an item in the store if it exists', function (done) {
        var person = {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          employer: 'ACME',
          age: '40'
        };

        var person2 = {
          id: 1,
          firstname: 'Jack',
          lastname: 'Doe',
          employer: 'ACME',
          age: '42'
        };

        idb.teststore
        .upsert([person, person2])
        .then(function (result) {
          expect(result).to.be.an('Array');
          expect(result[0]).to.equal(person);
          expect(result[1]).to.equal(person2);

          var store = compareDB.transaction(['teststore'], 'readonly').objectStore('teststore');
          var countReq = store.count();

          countReq.onsuccess = function (e) {
            expect(e.target.result).to.equal(1);

            var select = store.get(1);
            select.onsuccess = function (e) {
              expect(e.target.result).to.eql(person2);
              done();
            };
          };
        });
      });

      it('throws an error when the inserted object does not match the requirements of the store', function () {
        var personWithoutKeyPath = {
          firstname: 'Not',
          lastname: 'me'
        };

        return idb.teststore
        .upsert([personWithoutKeyPath])
        .catch(function (e) {
          expect(e.name).to.equal('DataError');
        });
      });

    });

    describe('remove', function () {

    });

    describe('clear', function () {

    });

  });

  describe('Selecting', function () {

    describe('count', function () {

    });

    describe('where condtions', function () {

    });

  });

});
