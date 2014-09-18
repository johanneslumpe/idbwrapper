'use strict';
/* jslint maxlen:200 */

var expect = require('chai').expect;
var sinon = require('sinon');

describe('TransactionWrapper', function () {
  var TransactionWrapper;
  var QueryWrapper;
  var wrapper;
  var db;
  var callback;
  var stores;
  var fakeTransaction;

  beforeEach(function () {
    TransactionWrapper = require('../../src/transactionwrapper');
    QueryWrapper = require('../../src/querywrapper');
    stores = ['teststore', 'demostore'];

    fakeTransaction = {
      abort: function () {
        this.onabort();
      }
    };
    // stubbing out our indexed db database
    db = {
      transaction: function () {
        return fakeTransaction;
      }
    };
    callback = function () {};
    wrapper = new TransactionWrapper(stores, callback, db);
  });

  describe('constructor', function () {

    it('sets the passed in stores as `_availableStores', function () {
      expect(wrapper._availableStores).to.equal(stores);
    });

    it('sets the passed in db object as `_database`', function () {
      expect(wrapper._database).to.equal(db);
    });

    it('sets the passed in callback function as `_callback`', function () {
      expect(wrapper._callback).to.equal(callback);
    });

    it('initializes `_transactionPromise` with a promise', function () {
      expect(wrapper._transactionPromise).to.be.instanceOf(Promise);
    });

    it('initializes `_callbackResult` with null', function () {
      expect(wrapper._callbackResult).to.be.null;
    });

    it('calls _autodetectStores with callback and stores if the autodetect option is true and assigns the result to _availableStores', function () {
      var _autodetectStores = TransactionWrapper.prototype._autodetectStores;
      var stub = TransactionWrapper.prototype._autodetectStores = sinon.stub();
      stub.returns(['test']);

      var wrapper = new TransactionWrapper(stores, callback, db, {
        autoDetectUsedStores: true
      });
      expect(wrapper._availableStores).to.deep.equal(['test']);

      wrapper = new TransactionWrapper(stores, callback, db);
      expect(stub.calledWith(callback, ['teststore', 'demostore'])).to.be.true;
      expect(stub.calledOnce).to.be.true;
      expect(wrapper._availableStores).to.deep.equal(['teststore', 'demostore']);

      TransactionWrapper.prototype._autodetectStores = _autodetectStores;
    });

    it('calls _setupStores', function () {
      var _setupStores = TransactionWrapper.prototype._setupStores;
      var spy = TransactionWrapper.prototype._setupStores = sinon.spy();
      var wrapper = new TransactionWrapper(stores, callback, db);
      expect(spy.calledOnce).to.be.true;
      TransactionWrapper.prototype._setupStores = _setupStores;
    });

  });

  describe('#_autodetectStores', function ()  {

    it('can detect stores using dot notation', function () {
      var callback = function (tx) {
        return tx.images.find()
        .then(function () {
          return tx.otherstore.count();
        });
      };

      var stores = wrapper._autodetectStores(callback, ['a', 'b', 'images', 'otherstore', 'e']);
      expect(stores).to.deep.equal(['images', 'otherstore']);
    });

    it('can detect stores using bracket notation', function () {
      var callback = function (tx) {
        return tx['images'].find()
        .then(function () {
          return tx["otherstore"].count();
        });
      };

      var stores = wrapper._autodetectStores(callback, ['a', 'b', 'images', 'otherstore', 'e']);
      expect(stores).to.deep.equal(['images', 'otherstore']);
    });

    it('can detect stores when using bracket and dot notation', function () {
      var callback = function (tx) {
        return tx.images.find()
        .then(function () {
          return tx["otherstore"].count();
        });
      };

      var stores = wrapper._autodetectStores(callback, ['a', 'b', 'images', 'otherstore', 'e']);
      expect(stores).to.deep.equal(['images', 'otherstore']);
    });

  });

  describe('#_setupStores', function () {

    it('defines all passed in stores as getter on the object', function () {
      // the constructor calls this method, so now teststore and demostore
      // should be defined
      expect(wrapper.teststore).to.be.ok;
      expect(wrapper.demostore).to.be.ok;
    });

    it('defines the getters to return an instance of QueryWrapper', function () {
      expect(wrapper.teststore).to.be.instanceOf(QueryWrapper);
      expect(wrapper.demostore).to.be.instanceOf(QueryWrapper);
    });

    it('calls the querywrapper with the correct arguments', function () {
      QueryWrapper = sinon.stub();

      var teststore = wrapper.teststore;
      expect(teststore._storename).to.equal('teststore');
      expect(teststore._connectionPromise).to.equal(wrapper._transactionPromise);
      expect(teststore._isInsideTransaction).to.be.true;

      var demostore = wrapper.demostore;
      expect(demostore._storename).to.equal('demostore');
      expect(demostore._connectionPromise).to.equal(wrapper._transactionPromise);
      expect(demostore._isInsideTransaction).to.be.true;
    });

  });

  describe('#performTransaction', function () {

    it('calls the callback with the wrapper as argument', function () {
      wrapper._callback = sinon.stub();
      wrapper._callback.returns(Promise.resolve());

      wrapper.performTransaction();

      expect(wrapper._callback.calledWith(wrapper)).to.be.true;
    });

    it('resolves the transaction promise with the value returned by the callback', function () {
      var wrapper = new TransactionWrapper(stores, function () {
        return Promise.resolve('test');
      }, db);

      var promise = wrapper.performTransaction();
      // fake successful transaction

      // force this to run in then next tick, when the above
      // promie will have been resolved
      setTimeout(function () {
        fakeTransaction.oncomplete();
      }, 0);

      return promise
      .then(function (result) {
        expect(result).to.equal('test');
      });
    });

    it('rejects the transaction promise with the error passe to the onerror handler', function () {
      var wrapper = new TransactionWrapper(stores, function () {
        return Promise.resolve('test');
      }, db);

      var promise = wrapper.performTransaction();
      // fake successful transaction
      fakeTransaction.onerror(new Error('boom'));

      return promise
      .then(function () {
        expect(true).to.be.false;
      })
      .catch(function (e) {
        expect(e.message).to.equal('boom');
      });
    });

    it('calls abort() on the transaction when an error occurs in the callback', function () {
      var wrapper = new TransactionWrapper(stores, function () {
        return Promise.reject(new Error('boom'));
      }, db);

      var promise = wrapper.performTransaction();
      // fake successful transaction
      fakeTransaction.onerror(new Error('boom'));

      sinon.spy(fakeTransaction, 'abort');
      return promise
      .then(function () {
        expect(true).to.be.false;
      })
      .catch(function (e) {
        expect(e.message).to.equal('boom');
        expect(fakeTransaction.abort.calledOnce).to.be.true;
      });
    });

  });

});
