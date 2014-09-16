'use strict';
/* jslint maxlen: 200 */
/* global indexedDB: true */

describe('Query', function () {
  var expect = require('chai').expect;
  var TESTDB = 'idbwrapper_integration_test';
  var IDBWrapper = require('../../src/idbwrapper');

  var idb;

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
        store.add(person);
        store.add(person2);

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
        store.add(person);
        store.add(person2);

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

    var persons = [
      {
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
        employer: 'ACME',
        age: 25
      },{
        id: 2,
        firstname: 'Jean Baptiste Emanuel',
        lastname: 'Zorg',
        employer: 'ZORG Enterprises'
      },{
        id: 3,
        firstname: 'Jazz',
        lastname: 'Jackrabbit',
        employer: 'Epic',
        age: 20
      },{
        id: 4,
        firstname: 'William',
        lastname: 'Blazkowicz',
        employer: 'OSA',
        age: 31
      },{
        id: 5,
        firstname: 'Jack',
        lastname: 'Aaaaaa',
        employer: 'ACME',
        age: 30
      },
    ];

    beforeEach(function (done) {
      var tx = idb._database.transaction(['teststore'], 'readwrite');
      var store = tx.objectStore('teststore');
      store.add(persons[0]);
      store.add(persons[1]);
      store.add(persons[2]);
      store.add(persons[3]);
      store.add(persons[4]);
      tx.oncomplete = function () {
        done();
      };

    });

    afterEach(function (done) {
      idb._database.transaction(['teststore'], 'readwrite')
      .objectStore('teststore')
      .clear()
      .onsuccess = function () {
        done();
      };
    });

    describe('find', function () {

      it('finds an item by key', function () {
        return idb.teststore
        .find(1)
        .then(function (result) {
          expect(result).to.eql(persons[0]);
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

      it('finds items using a where condition on an index', function () {
        return idb.teststore
        .find()
        .where.index('age').greaterThan(22)
        .then(function (result) {
          expect(result.length).to.equal(3);
          expect(result[0]).to.eql(persons[0]);
          expect(result[1]).to.eql(persons[4]);
          expect(result[2]).to.eql(persons[3]);
        });

      });

      it('finds items using a where condition on a field', function () {
        return idb.teststore
        .find()
        .where.field('firstname').equals('Jazz')
        .then(function (result) {
          expect(result.length).to.equal(1);
          expect(result[0]).to.eql(persons[2]);
        });
      });

      it('finds items using multiple where conditions on fields', function () {
        return idb.teststore
        .find()
        .where.field('age').greaterThan(26)
        .where.field('employer').equals('ACME')
        .then(function (result) {
          expect(result.length).to.equal(1);
          expect(result[0]).to.eql(persons[4]);
        });

      });

      it('finds items using a where condition on an index and on a field', function () {
        return idb.teststore
        .find()
        .where.index('lastname').greaterThan('C')
        .where.field('employer').equals('ACME')
        .then(function (result) {
          expect(result.length).to.equal(1);
          expect(result[0]).to.eql(persons[0]);
        });
      });

      it('finds items using a where condition on an index and multiple conditions on fields', function () {
        return idb.teststore
        .find()
        .where.index('lastname').lessThan('C')
        .where.field('age').greaterThan(10)
        .where.field('employer').equals('ACME')
        .then(function (result) {
          expect(result.length).to.equal(1);
          expect(result[0]).to.eql(persons[4]);
        });
      });

    });

    describe('findAll', function () {

      it('returns all records in the store', function () {
        return idb.teststore
        .findAll()
        .then(function (results) {
          expect(results.length).to.equal(persons.length);
        });
      });

    });

    describe('count', function () {

      it('counts all records in the store if no paramter is provided', function () {
        return idb.teststore
        .count()
        .then(function (count) {
          expect(count).to.equal(persons.length);
        });
      });

      it('counts the records of an index if a name is provided', function () {
        return idb.teststore
        .count('age')
        .then(function (count) {
          expect(count).to.equal(4);
        });
      });

    });

  });

});
