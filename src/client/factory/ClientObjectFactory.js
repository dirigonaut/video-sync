const FACTORY     = 'factory';
const FUNCTIONS   = 'functions';

var imports, log;

function ClientObjectFactory() { }

ClientObjectFactory.prototype.initialize = function(requires) {
  if(typeof ClientObjectFactory.prototype.protoInit === 'undefined') {
    ClientObjectFactory.prototype.protoInit = true;
    imports = requires;

    var enumerator = Object.create(null);
    for (var property in imports) {
      enumerator[property] = imports[property];
    }

    ClientObjectFactory.prototype.Enum = enumerator;

    generateFunctionHeaders.call(this);
  }
};

module.exports = ClientObjectFactory;

var generateFunctionHeaders = function() {
  for(let i in this.Enum) {
    this[`create${[i]}`] = function (init) {
      if(log) {
        log.silly(`Creating ${[i]}`);
      }

      var object;
      var ObjectImport = imports[i];

      if(ObjectImport.prototype) {
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
      } else {
        object = ObjectImport;
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
