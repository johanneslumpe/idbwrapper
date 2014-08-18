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
        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
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

          var store = idb._database.transaction(['teststore'], 'readonly').objectStore('teststore');
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

          var store = idb._database.transaction(['teststore'], 'readonly').objectStore('teststore');
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
        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
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

          var store = idb._database.transaction(['teststore'], 'readonly').objectStore('teststore');
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

          var store = idb._database.transaction(['teststore'], 'readonly').objectStore('teststore');
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

      beforeEach(function (done) {
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

        var tx = idb._database.transaction(['teststore'], 'readwrite');
        var store = tx.objectStore('teststore');
        var req = store.add(person);
        var req2 = store.add(person2);

        tx.oncomplete = function () {
          done();
        };
      });

      afterEach(function (done) {
        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
        store.clear().onsuccess = function () {
          done();
        };
      });

      it('removes a record based on its key', function (done) {
        idb.teststore.remove(2)
        .then(function () {
          var store = idb._database.transaction(['teststore'], 'readonly').objectStore('teststore');
          var countReq = store.count();
          countReq.onsuccess = function (e) {
            expect(e.target.result).to.equal(1);

            var select = store.get(2);
            select.onsuccess = function (e) {
              expect(e.target.result).to.equal(undefined);
              done();
            };
          };
        });
      });

    });

    describe('clear', function () {

      beforeEach(function (done) {
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

        var tx = idb._database.transaction(['teststore'], 'readwrite');
        var store = tx.objectStore('teststore');
        var req = store.add(person);
        var req2 = store.add(person2);

        tx.oncomplete = function () {
          done();
        };
      });

      after(function (done) {
        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
        store.clear().onsuccess = function () {
          done();
        };
      });

      it('removes all records from the store', function (done) {
        idb.teststore
        .clear()
        .then(function () {
          var store = idb._database.transaction(['teststore'], 'readonly').objectStore('teststore');
          var countReq = store.count();
          countReq.onsuccess = function (e) {
            expect(e.target.result).to.equal(0);
            done();
          };
        });
      });

    });

  });

  describe('Selecting', function () {

    describe('find', function () {

      beforeEach(function (done) {
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
          lastname: 'Test',
          employer: 'ZORG',
          age: '42'
        };

        var tx = idb._database.transaction(['teststore'], 'readwrite');
        var store = tx.objectStore('teststore');
        var req = store.add(person);
        var req2 = store.add(person2);
        tx.oncomplete = function () {
          done();
        };

      });

      afterEach(function (done) {
        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
        store.clear().onsuccess = function () {
          done();
        };
      });

      it('finds an item by key', function () {
        return idb.teststore
        .find(1)
        .then(function (result) {
          expect(result).to.eql({
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            employer: 'ACME',
            age: '40'
          });
        });
      });

      it('throws an error if the item cannot be found an true is passed as 2nd parameter', function () {
        return idb.teststore
        .find(10, true)
        .catch(function (e) {
          expect(e).to.be.ok;
        });
      });

    });

    describe('find with where conditions', function () {

    });

    describe('findAll', function () {});

    describe('count', function () {

      before(function (done) {
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

        var person3 = {
          id: 3,
          firstname: 'John',
          lastname: 'Doe',
          employer: 'ACME',
        };

        var insert1Done = false;
        var insert2Done = false;
        var insert3Done = false;

        var maybeDone = function () {
          if (insert1Done && insert2Done && insert3Done) {
            done();
          }
        };

        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
        var req = store.add(person);
        req.onsuccess = function () {
          insert1Done = true;
          maybeDone();
        };

        var req2 = store.add(person2);
        req2.onsuccess = function () {
          insert2Done = true;
          maybeDone();
        };

        var req3 = store.add(person3);
        req3.onsuccess = function () {
          insert3Done = true;
          maybeDone();
        };
      });

      after(function (done) {
        var store = idb._database.transaction(['teststore'], 'readwrite').objectStore('teststore');
        store.clear().onsuccess = function () {
          done();
        };
      });

      it('counts all records in the store if no paramter is provided', function () {
        return idb.teststore
        .count()
        .then(function (count) {
          expect(count).to.equal(3);
        });
      });

      it('counts the records of an index if a name is provided', function () {
        return idb.teststore
        .count('age')
        .then(function (count) {
          expect(count).to.equal(2);
        });
      });

    });

  });

});
