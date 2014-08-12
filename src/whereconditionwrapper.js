'use strict';

/**
 * Constructs a WhereConditionWrapper instance
 * @param {String} name        The name of the field/index/keypath
 * @param {String} type        The type of the where condition
 * @param {Object} parentQuery The parent QueryWrapper instance
 */
var WhereConditionWrapper = function (name, type, parentQuery) {
  // console.log('Creating where condition for: ' + type + ' ' + name);
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
  return this._comparisonValue;
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

/**
 * Assigns value a or b as comparison value
 * @param {IDBKeyRange} a The key range to use when not using a field
 * @param {Mixed} b       The value to compare with, when using a field
 */
WhereConditionWrapper.prototype._setComparisonValue = function (a, b) {
  this._comparisonValue = this._usesField ? b : a;
};

// include all comparators
WhereConditionWrapper.prototype.comparators = require('./wherecomparators');

/**
 * Handler for equals and only
 * @param  {Mixed} value The value to compare
 * @return {Object}      The parent QueryWrapper instance
 */
var onlyEquals = function (value) {
  this._setComparisonValue(IDBKeyRange.only(value), value);

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

/**
 * Alias for equals
 * @param  {Mixed} value The value to compare
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.only = onlyEquals;

/**
 * Creates a between condition where value1 and value2 are not included
 * in the result
 * @param  {Mixed} value1  The lower bound
 * @param  {Mixed} value2  The upper bound
 * @return {Object}        The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.between = function (value1, value2) {
  this._setComparisonValue(
    IDBKeyRange.bound(value1, value2, true, true),
    [value1, value2]
  );

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.BETWEEN
  );
};

/**
 * Creates range condition where value1 and value2 are included in the result
 * @param  {Mixed} value1  The lower bound
 * @param  {Mixed} value2  The upper bound
 * @return {Object}        The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.range = function (value1, value2) {
  this._setComparisonValue(
    IDBKeyRange.bound(value1, value2),
    [value1, value2]
  );

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.RANGE
  );
};

/**
 * Creates a greaterThan condition
 * @param  {Mixed} value The lower bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.greaterThan = function (value) {
  this._setComparisonValue(
    IDBKeyRange.lowerBound(value, true),
    value
  );

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.GREATERTHAN
  );
};

/**
 * Creates a greaterThanEqual condition
 * @param  {Mixed} value The lower bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.greaterThanEqual = function (value) {
  this._setComparisonValue(
    IDBKeyRange.lowerBound(value),
    value
  );

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.GREATERTHANEQUAL
  );
};

/**
 * Creates a lessThan condition
 * @param  {Mixed} value The upper bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.lessThan = function (value) {
  this._setComparisonValue(
    IDBKeyRange.upperBound(value, true),
    value
  );

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.LESSTHAN
  );
};

/**
 * Creates a lessThanEqual condition
 * @param  {Mixed} value The lower bound
 * @return {Object}      The parent QueryWrapper instance
 */
WhereConditionWrapper.prototype.lessThanEqual = function (value) {
  this._setComparisonValue(
    IDBKeyRange.upperBound(value),
    value
  );

  return this._setComparisonTypeAndReturnParent(
    WhereConditionWrapper.comparisonTypes.LESSTHANEQUAL
  );
};

module.exports = WhereConditionWrapper;
