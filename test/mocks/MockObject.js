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

MockObject.prototype.callMock = function(key) {
  if(this[key + EVENT]) {
    var trigger = this[key + EVENT].pop();

    if(typeof trigger === 'function') {
      trigger();
    }
  }

  if(this[key + VALUE]) {
    return this[key + VALUE].pop();
  }
};

module.exports = MockObject;
