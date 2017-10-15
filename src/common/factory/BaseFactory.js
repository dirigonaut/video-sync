const FUNCTIONS   = 'functions';
const ENUMS       = 'Enums';
const FACTORY     = 'factory';

function BaseFactory() { }

BaseFactory.prototype.genObjects = function(imports) {
  generateFunctionHeaders.call(this, imports);
};

module.exports = BaseFactory;

var generateFunctionHeaders = function(imports) {
  for(let i in this.Enum) {
    this[`create${this.Enum[i]}`] = function () {
      var object;
      var ObjectImport = require(imports[this.Enum[i]]);

      if(ObjectImport.prototype) {
        object = Object.create(ObjectImport.prototype);

        if(!ObjectImport.prototype[FACTORY]) {
          Object.defineProperty(ObjectImport.prototype, FACTORY, {
            enumerable: false,
            writeable: false,
            value: this
          });
        }

        if(!ObjectImport.prototype[FUNCTIONS]) {
          Object.defineProperty(ObjectImport.prototype, FUNCTIONS, {
            enumerable: false,
            writeable: false,
            value: generateObjectFunctionInfo(object)
          });
        }

        if(!ObjectImport.prototype[ENUMS]) {
          Object.defineProperty(ObjectImport.prototype, ENUMS, {
            enumerable: false,
            writeable: false,
            value: generateObjectEnumInfo(object)
          });
        }

        if(typeof object.initialize !== 'undefined') {
          var result = object.initialize();
          if(result instanceof Promise) {
            object = result;
          }
        }
      } else {
        object = ObjectImport;
      }

      return object;
    }.bind(this);

    this[`get${this.Enum[i]}Info`] = function () {
      var object;
      var ObjectImport = require(imports[this.Enum[i]]);

      if(ObjectImport.prototype) {
        object = Object.create(ObjectImport.prototype);

        if(!ObjectImport.prototype[FUNCTIONS]) {
          Object.defineProperty(ObjectImport.prototype, FUNCTIONS, {
            enumerable: false,
            writeable: false,
            value: generateObjectFunctionInfo(object)
          });
        }

        if(!ObjectImport.prototype[ENUMS]) {
          Object.defineProperty(ObjectImport.prototype, ENUMS, {
            enumerable: false,
            writeable: false,
            value: generateObjectEnumInfo(object)
          });
        }
      } else {
        throw new Error(`There is not a prototype base for ${this.Enum[i]}`)
      }

      return object;
    }.bind(this);
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
    if (typeof object.Enum[property] === 'object') {
      enums[property.toUpperCase()] = object.Enum[property];
    }
  }
  return enums;
};
