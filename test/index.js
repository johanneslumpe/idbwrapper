'use strict';

// use es6-promise during the tests for browser who
// do not support promises natively.
var Promise = require('es6-promise').Promise;

describe('Unit tests', function () {
  require('./unit');
});

describe('Integration tests', function () {
  require('./integration');
});
