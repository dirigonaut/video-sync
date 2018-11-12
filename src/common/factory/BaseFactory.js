const Promise   = require("bluebird");

const FUNCTIONS = "Functions";
const ENUMS     = "Enums";
const FACTORY   = "factory";

function BaseFactory() { }

BaseFactory.prototype.generateFactory = function(Factory, imports) {
  Object.setPrototypeOf(Factory.prototype, BaseFactory.prototype);
  generateFunctionHeaders.call(this, imports);
};

module.exports = BaseFactory;

var generateFunctionHeaders = function(imports) {
  for(let i in this.Enum) {
    let ObjectImport;

    if(typeof imports[this.Enum[i]] === "string") {
      ObjectImport = require(imports[this.Enum[i]]);
    } else {
      ObjectImport = imports[this.Enum[i]];
    }

    BaseFactory.prototype[`create${this.Enum[i]}`] = function(initFlag) {
      return generateObject.call(this, ObjectImport, initFlag);
    }.bind(this);

    BaseFactory.prototype[`get${this.Enum[i]}Info`] = function() {
      var Info = function() {};
      generateObjectInfo(Info, ObjectImport);
      return Object.create(Info.prototype);
    }.bind(this);
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

      generateObjectInfo(ObjectImport, ObjectImport);
    }

    if(typeof object.initialize !== "undefined") {
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

var generateObjectInfo = function (Import, Info) {
  if(typeof Import.prototype !== "undefined" && !Import.prototype[FUNCTIONS]) {
    Object.defineProperty(Import.prototype, FUNCTIONS, {
      enumerable: false,
      writeable: false,
      value: generateObjectFunctionInfo(Info)
    });
  }

  if(typeof Import.prototype !== "undefined" && !Import.prototype[ENUMS]) {
    Object.defineProperty(Import.prototype, ENUMS, {
      enumerable: false,
      writeable: false,
      value: generateObjectEnumInfo(Info)
    });
  }
};

var generateObjectFunctionInfo = function(object) {
  var funcs = { };
  for (var property in object.prototype) {
    if (typeof object.prototype[property] === "function") {
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
