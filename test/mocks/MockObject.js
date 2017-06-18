const Promise = require('bluebird');

const VALUE = "Value";
const EVENT = "Event";

function MockObject() { }

MockObject.prototype.pushReturn = function(key, value) {
  if(!this[key + VALUE]) {
    this[key + VALUE] = [];
  }

  this[key + VALUE].push(value);
  console.log(this[key + VALUE]);
};

MockObject.prototype.pushEvent = function(key, trigger) {
  if(!this[key + EVENT]) {
    this[key + EVENT] = [];
  }

  this[key + EVENT].push(trigger);
};

MockObject.prototype.callMockAsync = Promise.coroutine(function* () {
  var args = Array.from(arguments);
  var key = args.shift();
  if(this[key + EVENT]) {
    var trigger = this[key + EVENT].pop();

    if(typeof trigger === 'function') {
      trigger();
    }
  }

  if(this[key + VALUE]) {
    var value = this[key + VALUE].pop();
    return typeof value === 'function' ? value.apply(this, args) : value;
  }
});

MockObject.prototype.callMock = function() {
  var args = Array.from(arguments);
  var key = args.shift();
  if(this[key + EVENT]) {
    var trigger = this[key + EVENT].pop();

    if(typeof trigger === 'function') {
      trigger();
    }
  }

  if(this[key + VALUE]) {
    var value = this[key + VALUE].pop();
    return typeof value === 'function' ? value.apply(this, args) : value;
  }
};

module.exports = MockObject;
