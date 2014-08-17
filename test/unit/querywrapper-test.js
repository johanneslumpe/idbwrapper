'use strict';
/* jslint maxlen:200 */

var expect = require('chai').expect;

describe('QueryWrapper', function () {
  var QueryWrapper;
  var WhereConditionWrapper;
  var wrapper;
  var connectionPromise;

  beforeEach(function () {
    QueryWrapper = require('../../src/querywrapper');
    WhereConditionWrapper = require('../../src/whereconditionwrapper');
    connectionPromise = Promise.resolve({});
    wrapper = new QueryWrapper('teststore', connectionPromise, false);
  });

  describe('constructor', function () {

    it('sets the passed in storename as `_storename', function () {
      expect(wrapper._storename).to.equal('teststore');
    });

    it('sets the passed in connection promise as `_connectionPromise`', function () {
      expect(wrapper._connectionPromise).to.equal(connectionPromise);
    });

    it('sets `_isInsideTransaction` to the boolean value of the passed in value', function () {
      expect(wrapper._isInsideTransaction).to.equal(false);

      var w = new QueryWrapper('testing', {}, 'true');
      expect(w._isInsideTransaction).to.equal(true);

      w = new QueryWrapper('testing', {}, []);
      expect(w._isInsideTransaction).to.equal(true);
    });

    it('initializes `_findKey` with `null`', function () {
      expect(wrapper._findKey).to.equal(null);
    });

    it('initializes `_whereConditions` as empty array', function () {
      expect(wrapper._whereConditions).to.eql([]);
    });

    it('initializes `_queryType` with `null`', function () {
      expect(wrapper._queryType).to.equal(null);
    });

    it('initializes `_tranctionMode` as read-only', function () {
      expect(wrapper._tranctionMode).to.equal(QueryWrapper.transactionMode.READONLY);
    });

  });

  describe('#where (property)', function () {

    it('returns an object with an `index` and a `field` method', function () {
      var where = wrapper.where;
      expect(where).to.respondTo('field');
      expect(where).to.respondTo('index');
    });

    ['index', 'field']
    .forEach(function (method) {

      describe('#' + method, function () {
        var conditionWrapper;

        beforeEach(function () {
          conditionWrapper = wrapper.where[method]('test');
        });

        it('returns the created `WhereConditionWrapper` instance', function () {
          expect(conditionWrapper).to.be.an.instanceOf(WhereConditionWrapper);
        });

        it('pushes a new `WhereConditionWrapper` to `_whereConditions', function () {
          expect(wrapper._whereConditions.length).to.equal(1);
          expect(wrapper._whereConditions[0]).to.be.an.instanceOf(WhereConditionWrapper);
        });

        it('passes the correct name to the condition wrapper', function () {
          expect(conditionWrapper.getName()).to.equal('test');
        });

        it('passes the ' + method.toUpperCase() + ' condition type to the wrapper', function () {
          expect(conditionWrapper.isType(WhereConditionWrapper.conditionTypes[method.toUpperCase()])).to.equal(true);
        });

      });

    });

  });

  describe('#find', function () {});

  describe('#findAll', function () {});

  describe('#insert', function () {});

  describe('#upsert', function () {});

  describe('#remove', function () {});

  describe('#clear', function () {});

  describe('#count', function () {});

  // private api
  describe('#_execute', function () {});

  describe('#_setQueryTypeAndTransactionMode', function () {});

  describe('#_find', function () {});

  describe('#_findForKey', function () {});

  describe('#_findAll', function () {});

  describe('#_findWithConditions', function () {});

  describe('#_insert', function () {});

  describe('#_upsert', function () {});

  describe('#_remove', function () {});

  describe('#_clear', function () {});

  describe('#_count', function () {});

});
