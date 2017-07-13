var imports;

function ClientObjectFactory() { }

ClientObjectFactory.prototype.initialize = function(requires) {
  if(typeof ClientObjectFactory.prototype.protoInit === 'undefined') {
    ClientObjectFactory.prototype.protoInit = true;
    imports = requires;
    var enumerator;

    var keys = Object.keys(imports);
    for(var i = 0; i < keys.length; ++i) {
      enumerator[keys[i].toUpperCase()] = keys[i];
    }

    ClientObjectFactory.prototype.Enum = enumerator;

    generateFunctionHeaders.call(this);
  }
};

module.exports = ObjectFactory;

var generateFunctionHeaders = function() {
  for(let i in this.Enum) {
    this[`create${this.Enum[i]}`] = function (init) {
      if(log) {
        log.silly(`Creating ${this.Enum[i]}`);
      }

      var ObjectImport = imports[this.Enum[i]];
      var object = Object.create(ObjectImport.prototype);

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
          value: generateObjectFunctionEnum(object)
        });
      }

      if(typeof object.initialize !== 'undefined') {
        var result = object.initialize(init);
        if(result instanceof Promise) {
          object = result;
        }
      }

      return object;
    }.bind(this);
  }
};

var generateObjectFunctionEnum = function(object) {
  var funcs = {};
  for (var property in object) {
    if (typeof object[property] === 'function') {
      funcs[property.toUpperCase()] = property;
    }
  }
  return funcs;
}
