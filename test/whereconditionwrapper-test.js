/* jslint maxlen:200 */
'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('WhereConditionWrapper', function () {
  var WhereConditionWrapper;
  var parentQueryObject;
  var wrapper;

  beforeEach(function () {
    parentQueryObject = {};
    WhereConditionWrapper = require('../src/whereconditionwrapper');
    wrapper = new WhereConditionWrapper(
      'test',
      WhereConditionWrapper.conditionTypes.INDEX,
      parentQueryObject
    );
  });

  it('exports a function', function () {
    expect(WhereConditionWrapper).to.be.a('Function');
  });

  describe('constructor', function () {

    it('sets the passed in name on the instance', function () {
      expect(wrapper._name).to.equal('test');
    });

    it('sets the passed in type on the instance', function () {
      expect(wrapper._type).to.equal(WhereConditionWrapper.conditionTypes.INDEX);
    });

    it('sets the passed in parentQueryObject on the instance', function () {
      expect(wrapper._parentQuery).to.equal(parentQueryObject);
    });

    it('initializes `_range`, `_comparisonType` and `_comparisonValue` with null', function () {
      ['_range', '_comparisonType', '_comparisonValue'].forEach(function (key) {
        expect(wrapper[key]).to.equal(null);
      });
    });

    it('sets _usesField only to true when using the FIELD condition type', function () {
      var keys = [
        WhereConditionWrapper.conditionTypes.INDEX,
        WhereConditionWrapper.conditionTypes.FIELD,
        WhereConditionWrapper.conditionTypes.KEYPATH
      ];
      var values = [false, true, false];

      keys.forEach(function (key, index) {
        var wrapper = new WhereConditionWrapper('test', key, parentQueryObject);
        expect(wrapper._usesField).to.equal(values[index]);
      });
    });

  });

  describe('#getName', function () {

    it('returns the index/field name the wrapper was initialized with', function () {
      expect(wrapper.getName()).to.equal('test');
    });

  });

  describe('#isType', function () {

    it('returns true if the condition type of the wrapper matches', function () {
      expect(wrapper.isType(WhereConditionWrapper.conditionTypes.INDEX)).to.equal(true);
      expect(wrapper.isType(WhereConditionWrapper.conditionTypes.FIELD)).to.equal(false);
      expect(wrapper.isType(WhereConditionWrapper.conditionTypes.KEYPATH)).to.equal(false);

      var fieldWrapper = new WhereConditionWrapper('test', WhereConditionWrapper.conditionTypes.FIELD, parentQueryObject);

      expect(fieldWrapper.isType(WhereConditionWrapper.conditionTypes.INDEX)).to.equal(false);
      expect(fieldWrapper.isType(WhereConditionWrapper.conditionTypes.FIELD)).to.equal(true);
      expect(fieldWrapper.isType(WhereConditionWrapper.conditionTypes.KEYPATH)).to.equal(false);
    });

  });

  describe('#_setComparisonTypeAndReturnParent', function () {

    it('sets the passed in comparison type on the object and returns the parentQueryObject', function () {
      expect(wrapper._comparisonType).to.equal(null);
      var obj = wrapper._setComparisonTypeAndReturnParent(WhereConditionWrapper.comparisonTypes.EQUAL);

      expect(wrapper._comparisonType).to.equal(WhereConditionWrapper.comparisonTypes.EQUAL);
      expect(obj).to.equal(parentQueryObject);
    });

  });

  describe('#getCondition', function () {

    it('returns `_comparisonValue`', function () {
      var val = wrapper._comparisonValue = 'testing';

      expect(wrapper.getCondition()).to.equal(val);
    });

  });

  describe('#getComparator', function () {

    it('throws an error when the conditionType is not FIELD', function () {
      expect(function () {
        wrapper.getComparator();
      }).to.throw();
    });

    it('returns the comparator for the comparison type, bound to the instance', function () {
      var wrapper = new WhereConditionWrapper(
        'test',
        WhereConditionWrapper.conditionTypes.FIELD,
        parentQueryObject
      );

      // mock comparator
      var spy = WhereConditionWrapper.prototype.comparators.EQUALS = sinon.spy();

      wrapper._comparisonType = WhereConditionWrapper.comparisonTypes.EQUALS;

      var returnedComparator = wrapper.getComparator();
      expect(returnedComparator).to.not.equal(spy);
      returnedComparator();
      expect(spy.calledOnce).to.equal(true);
    });

  });

  describe('#_setComparisonValue', function () {

    it('sets the first value, if `_usesField` is false', function () {
      var value1 = 'value1';
      var value2 = 'value2';

      wrapper._usesField = false;
      wrapper._setComparisonValue(value1, value2);
      expect(wrapper._comparisonValue).to.equal(value1);
    });

    it('sets the second value, if `_usesField` is true', function () {
      var value1 = 'value1';
      var value2 = 'value2';

      wrapper._usesField = true;
      wrapper._setComparisonValue(value1, value2);
      expect(wrapper._comparisonValue).to.equal(value2);
    });

  });

  describe('comparison functions', function () {

    var setComparisonValueSpy;
    var setComparisonTypeSpy;

    beforeEach(function () {
      setComparisonValueSpy = wrapper._setComparisonValue = sinon.spy();
      setComparisonTypeSpy = wrapper._setComparisonTypeAndReturnParent = sinon.spy();

    });

    describe('#equals', function () {

      it('calls _setComparisonValue with `IDBKeyRange.only(value)` and `value`', function () {
        wrapper.equals('test');
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.only('test'), 'test')).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of EQUALS', function () {
        wrapper.equals('test');
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.EQUALS)).to.equal(true);
      });

    });

    describe('#only', function () {

      it('is an alias for `equals`', function () {
        expect(wrapper.only).to.equal(wrapper.equals);
      });

    });

    describe('#between', function () {

      it('calls _setComparisonValue with `IDBKeyRange.bound(value1, value2, true, true)` and `[value1, value2]`', function () {
        wrapper.between(10, 100);
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.bound(10, 100, true, true), [10, 100])).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of BETWEEN', function () {
        wrapper.between(10, 100);
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.BETWEEN)).to.equal(true);
      });

    });

    describe('#range', function () {

      it('calls _setComparisonValue with `IDBKeyRange.bound(value1, value2)` and `[value1, value2]`', function () {
        wrapper.range(10, 100);
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.bound(10, 100), [10, 100])).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of RANGE', function () {
        wrapper.range(10, 100);
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.RANGE)).to.equal(true);
      });

    });

    describe('#greaterThan', function () {

      it('calls _setComparisonValue with `IDBKeyRange.lowerBound(value, true)` and `value`', function () {
        wrapper.greaterThan(10);
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.lowerBound(10, true), 10)).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of GREATERTHAN', function () {
        wrapper.greaterThan(10);
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.GREATERTHAN)).to.equal(true);
      });

    });

    describe('#greaterThanEqual', function () {

      it('calls _setComparisonValue with `IDBKeyRange.lowerBound(value)` and `value`', function () {
        wrapper.greaterThanEqual(10);
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.lowerBound(10), 10)).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of GREATERTHANEQUAL', function () {
        wrapper.greaterThanEqual(10);
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.GREATERTHANEQUAL)).to.equal(true);
      });

    });

    describe('#lessThan', function () {

      it('calls _setComparisonValue with `IDBKeyRange.upperBound(value, true)` and `value`', function () {
        wrapper.lessThan(10);
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.upperBound(10, true), 10)).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of LESSTHAN', function () {
        wrapper.lessThan(10);
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.LESSTHAN)).to.equal(true);
      });

    });

    describe('#lessThanEqual', function () {

      it('calls _setComparisonValue with `IDBKeyRange.upperBound(value)` and `value`', function () {
        wrapper.lessThanEqual(10);
        expect(setComparisonValueSpy.calledWithExactly(IDBKeyRange.upperBound(10), 10)).to.equal(true);
      });

      it('calls _setComparisonTypeAndReturnParent with a comparison type of LESSTHANEQUAL', function () {
        wrapper.lessThanEqual(10);
        expect(setComparisonTypeSpy.calledWithExactly(WhereConditionWrapper.comparisonTypes.LESSTHANEQUAL)).to.equal(true);
      });

    });

  });

});
