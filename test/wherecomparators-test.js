'use strict';
/* jslint maxlen:200 */

var expect = require('chai').expect;

describe('WhereComparators', function () {
  var comparators;
  var testObject;

  beforeEach(function () {
    comparators = require('../src/wherecomparators');
    testObject = {};
  });

  describe('#equals', function () {

    it('returns true if `_comparisonValue` is strictly equal with the tested value', function () {
      testObject._comparisonValue = 123;
      expect(comparators.EQUALS.call(testObject, 123)).to.equal(true);
    });

    it('returns false if `_comparisonValue` is not strictly equal with the tested value', function () {
      testObject._comparisonValue = 123;
      expect(comparators.EQUALS.call(testObject, 456)).to.equal(false);

      testObject._comparisonValue = null;
      expect(comparators.EQUALS.call(testObject, undefined)).to.equal(false);

      // fix this one later to actually be true
      testObject._comparisonValue = {};
      expect(comparators.EQUALS.call(testObject, {})).to.equal(false);
    });

  });

  describe('#between', function () {

    it('returns true if the tested value is between the two values in the `_comparisonValue` array', function () {
      testObject._comparisonValue = [5, 20];
      expect(comparators.BETWEEN.call(testObject, 10)).to.equal(true);
    });

    it('returns false if the tested value is not between the two values in the `_comparisonValue` array the types do not match', function () {
      testObject._comparisonValue = [1, 3];
      expect(comparators.BETWEEN.call(testObject, 10)).to.equal(false);
    });

    it('returns false if the tested value is equal to one of the boundaries', function () {
      testObject._comparisonValue = [1,3];

      expect(comparators.BETWEEN.call(testObject, 1)).to.equal(false);
      expect(comparators.BETWEEN.call(testObject, 3)).to.equal(false);
    });

  });

  describe('#range', function () {

    it('returns true if the tested value is inside the range of the two values in the `_comparisonValue` array', function () {
      testObject._comparisonValue = [5, 20];
      expect(comparators.RANGE.call(testObject, 10)).to.equal(true);
    });

    it('returns false if the tested value is not inside the range the two values in the `_comparisonValue` array or the types do not match', function () {
      testObject._comparisonValue = [1, 3];
      expect(comparators.RANGE.call(testObject, 10)).to.equal(false);
    });

    it('returns true if the tested value is equal to one of the boundaries', function () {
      testObject._comparisonValue = [1,3];

      expect(comparators.RANGE.call(testObject, 1)).to.equal(true);
      expect(comparators.RANGE.call(testObject, 3)).to.equal(true);
    });

  });

  describe('#greaterThan', function () {

    it('returns true if the tested value is greater than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;
      expect(comparators.GREATERTHAN.call(testObject, 10)).to.equal(true);
    });

    it('returns false if the tested value is less than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;
      expect(comparators.GREATERTHAN.call(testObject, 5)).to.equal(false);
      expect(comparators.GREATERTHAN.call(testObject, 4)).to.equal(false);
    });

  });

  describe('#greaterThanEqual', function () {

    it('returns true if the tested value is equal to or greater than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;
      expect(comparators.GREATERTHANEQUAL.call(testObject, 10)).to.equal(true);
      expect(comparators.GREATERTHANEQUAL.call(testObject, 5)).to.equal(true);
    });

    it('returns false if the tested value is not equal to or less than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;

      expect(comparators.GREATERTHANEQUAL.call(testObject, 4)).to.equal(false);
    });

  });

  describe('#lessThan', function () {

    it('returns true if the tested value is less than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;
      expect(comparators.LESSTHAN.call(testObject, 4)).to.equal(true);
    });

    it('returns false if the tested value is equal to or greater than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;
      expect(comparators.LESSTHAN.call(testObject, 5)).to.equal(false);
      expect(comparators.LESSTHAN.call(testObject, 6)).to.equal(false);
    });

  });

  describe('#lessThanEqual', function () {

    it('returns true if the tested value is equal to or less than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;
      expect(comparators.LESSTHANEQUAL.call(testObject, 5)).to.equal(true);
      expect(comparators.LESSTHANEQUAL.call(testObject, 4)).to.equal(true);
    });

    it('returns false if the tested value is greater than `_comparisonValue`', function () {
      testObject._comparisonValue = 5;

      expect(comparators.LESSTHANEQUAL.call(testObject, 6)).to.equal(false);
    });

  });

});
