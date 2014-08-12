/* jslint node:true  */
/* global Promise: true, IDBKeyRange: true */
'use strict';

/**
 * Constructs a WhereConditionWrapper instance
 * @param {String} name        The name of the field/index/keypath
 * @param {String} type        The type of the where condition
 * @param {Object} parentQuery The parent QueryWrapper instance
 */
var WhereConditionWrapper = function (name, type, parentQuery) {
  console.log('Creating where condition for: ' + type + ' ' + name);
  this._parentQuery = parentQuery;
  this._type = type;
  this._name = name;
  this._usesField = type === WhereConditionWrapper.conditionTypes.FIELD;

  this._range = null;
  this._comparisonValue = null;
  this._comparisonType = null;
};

WhereConditionWrapper.conditionTypes = {
  INDEX : 'INDEX',
  FIELD: 'FIELD',
  KEYPATH: 'KEYPATH'
};

WhereConditionWrapper.comparisonTypes = {
  EQUALS: 'EQUALS',
  BETWEEN: 'BETWEEN',
  RANGE: 'RANGE',
  GREATERTHAN: 'GREATERTHAN',
  GREATERTHANEQUAL: 'GREATERTHANEQUAL',
  LESSTHAN: 'LESSTHAN',
  LESSTHANEQUAL: 'LESSTHANEQUAL'
};

/**
 * Sets the comparison type and returns the parent query instance for chaining
 * @param {String} type The where condition type
 */
WhereConditionWrapper.prototype._setComparisonTypeAndReturnParent = function (type) {
  this._comparisonType = type;
  return this._parentQuery;
};

/**
 * Returns the generated condition
 * @return {Mixed} The condition
 */
WhereConditionWrapper.prototype.getCondition = function () {
  if (this._usesField) {
    return this._comparisonValue;
  } else {
    return this._range;
  }
};

/**
 * Get the name of the field/index this condition should be applid to
 * @return {String} The field/index name
 */
WhereConditionWrapper.prototype.getName = function () {
  return this._name;
};

/**
 * Checks whether the condition is of the passed in type
 * @param  {String}  type The type to compare
 * @return {Boolean}      Whether the condition is the expected type
 */
WhereConditionWrapper.prototype.isType = function (type) {
  return this._type === type;
};

/**
 * Returns the comparator function for the condition type
 * @return {Function} The comparator function
 */
WhereConditionWrapper.prototype.getComparator = function () {
  if (!this.isType(WhereConditionWrapper.conditionTypes.FIELD)) {
    throw new Error('only field where conditions can generate comparators');
  }

  return this.comparators[this._comparisonType].bind(this);
};

WhereConditionWrapper.prototype.comparators = require('./wherecomparators');

/**
 * Handler for equals and only
 * @param  {Mixed} value The value to compare
 * @return {Object}      The parent QueryWrapper instance
 */
var onlyEquals = function (value) {
  if (!this._usesField) {
    this._range = IDBKeyRange.only(value);
  } else {
    this._comparisonValue = value;
  }

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.EQUALS
  );
};

/**
 * Handler for equals
 * @param  {Mixed} value The value to compare
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.equals = onlyEquals;
// equals: IDBKeyRange.only('value');

/**
 * Alias for equals
 * @param  {Mixed} value The value to compare
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.only = onlyEquals;
// alias for equals
// 

/**
 * Creates a between condition where value1 and value2 are not included
 * in the result
 * @param  {Mixed} value1  The lower bound
 * @param  {Mixed} value2  The upper bound
 * @return {Object}        The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.between = function (value1, value2) {
  if (!this._usesField) {
    this._range = IDBKeyRange.bound(value1, value2, true, true);
  } else {
    this._comparisonValue = [value1, value2];
  }
  
  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.BETWEEN
  );
};
// between: IDBKeyRange.bound('valueOne', 'valueTwo', true, true)
// this returns only the values between valueOne and valueTwo, but not valueOne or valueTwo

/**
 * Creates range condition where value1 and value2 are included in the result
 * @param  {Mixed} value1  The lower bound
 * @param  {Mixed} value2  The upper bound
 * @return {Object}        The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.range = function (value1, value2) {
  if (!this._usesField) {
    this._range = IDBKeyRange.bound(value1, value2);
  } else {
    this._comparisonValue = [value1, value2];
  }
  
  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.RANGE
  );
};
// range: IDBKeyRange.bound('valueOne', 'valueTwo')
// this includes valueOne and valueTwo into the result

/**
 * Creates a greaterThan condition
 * @param  {Mixed} value The lower bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.greaterThan = function (value) {
  if (!this._usesField) {
    this._range = IDBKeyRange.lowerBound(value, true);
  } else {
    this._comparisonValue = value;
  }
  
  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.GREATERTHAN
  );
};
// greaterThan: IDBKeyRange.lowerBound('value', true);
/**
 * Creates a greaterThanEqual condition
 * @param  {Mixed} value The lower bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.greaterThanEqual = function (value) {
  if (!this._usesField) {
    this._range = IDBKeyRange.lowerBound(value);
  } else {
    this._comparisonValue = value;
  }
  
  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.GREATERTHANEQUAL
  );
};
// greaterThan: IDBKeyRange.lowerBound('value');

/**
 * Creates a lessThan condition
 * @param  {Mixed} value The upper bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.lessThan = function (value) {
  if (!this._usesField) {
    this._range = IDBKeyRange.upperBound(value, true);
  } else {
    this._comparisonValue = value;
  }
  
  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.LESSTHAN
  );
};
// lessThan: IDBKeyRange.upperBound('value', true);

/**
 * Creates a lessThanEqual condition
 * @param  {Mixed} value The lower bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.lessThanEqual = function (value) {
  if (!this._usesField) {
    this._range = IDBKeyRange.upperBound(value);
  } else {
    this._comparisonValue = value;
  }
  
  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.LESSTHANEQUAL
  );
};
// lessThan: IDBKeyRange.upperBound('value');

module.exports = WhereConditionWrapper;

// usage:
// using find() without a key, will just set the querymode to 'find' and the transaction mode to 'readonly'
// then we can chain our conditions
// 
// wrapper
// .where.index('indexname').only('value').
// .where.index('otherindex').between('first', 'second');
// .where.field('nested.field').equals('value')
// 


// searching partially through a multi-index is possible like this:
// var key = IDBKeyRange.bound(['lum.pe', ''],['lum.pe', '\uffff']);
//
// this will match all results where the first column is 'lum.pe' and the 2nd column can have any value
// 
// filtering on other fields has to be done in code rather than inside the _database
// 
// implement a method like every(3), which would return every 3rd record from the result
