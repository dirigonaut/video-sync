const Promise   = require('bluebird');

const FUNCTIONS = 'functions';
const ENUMS     = 'Enums';
const FACTORY   = 'factory';

function BaseFactory() { }

BaseFactory.prototype.generateFactory = function(Factory, imports) {
  Object.setPrototypeOf(Factory.prototype, BaseFactory.prototype);
  generateFunctionHeaders.call(this, imports);
};

module.exports = BaseFactory;

var generateFunctionHeaders = function(imports) {
  for(let i in this.Enum) {
    let ObjectImport;

    if(typeof imports[this.Enum[i]] === 'string') {
      ObjectImport = require(imports[this.Enum[i]]);
    } else {
      ObjectImport = imports[this.Enum[i]];
    }

    BaseFactory.prototype[`create${this.Enum[i]}`] = function(initFlag) {
      return generateObject.call(this, ObjectImport, initFlag);
    }.bind(this);

    if(ObjectImport && typeof ObjectImport.prototype !== 'undefined') {
      BaseFactory.prototype[`get${this.Enum[i]}Info`] = function() {
        return generateObjectInfo.call(this, ObjectImport);
      }.bind(this);
    }
  }
};

var generateObject = function (ObjectImport, initFlag) {
  var object;

  if(ObjectImport.prototype) {
    object = Object.create(ObjectImport.prototype);

    if(!ObjectImport.prototype[FACTORY]) {
      Object.defineProperty(ObjectImport.prototype, FACTORY, {
        enumerable: false,
        writeable: false,
        value: this
      });
    }

    generateObjectInfo(ObjectImport);

    if(typeof object.initialize !== 'undefined') {
      var result = object.initialize(initFlag);
      if(result instanceof Promise) {
        object = result;
      }

    }
  } else {
    object = ObjectImport;
  }

  return object;
};

var generateObjectInfo = function (ObjectImport) {
  if(!ObjectImport.prototype[FUNCTIONS]) {
    Object.defineProperty(ObjectImport.prototype, FUNCTIONS, {
      enumerable: false,
      writeable: false,
      value: generateObjectFunctionInfo(ObjectImport)
    });
  }

  if(!ObjectImport.prototype[ENUMS]) {
    Object.defineProperty(ObjectImport.prototype, ENUMS, {
      enumerable: false,
      writeable: false,
      value: generateObjectEnumInfo(ObjectImport)
    });
  }
};

var generateObjectFunctionInfo = function(object) {
  var funcs = { };
  for (var property in object) {
    if (typeof object[property] === 'function') {
      funcs[property.toUpperCase()] = property;
    }
  }
  return funcs;
};

var generateObjectEnumInfo = function(object) {
  var enums = { };
  for (var property in object.Enum) {
    enums[property.toUpperCase()] = object.Enum[property];
  }
  return enums;
};
