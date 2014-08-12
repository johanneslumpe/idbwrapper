/* jslint node:true  */
'use strict';

module.exports = {
  EQUALS: function (value) {
    return value === this._comparisonValue;
  },
  BETWEEN: function (value) {
    return value > this._comparisonValue[0] && value < this._comparisonValue[1];
  },
  RANGE: function (value) {
    return value >= this._comparisonValue[0] && value <= this._comparisonValue[1];
  },
  GREATERTHAN: function (value) {
    return value > this._comparisonValue;
  },
  GREATERTHANEQUAL: function (value) {
    return value >= this._comparisonValue;
  },
  LESSTHAN: function (value) {
    return value < this._comparisonValue;
  },
  LESSTHANEQUAL: function (value) {
    return value <= this._comparisonValue;
  }
};
