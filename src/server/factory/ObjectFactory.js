const Promise   = require('bluebird');
const Path      = require('path');

const SERVER_DIR  = Path.join(__dirname, '../../server');
const COMMON_DIR  = Path.join(__dirname, '../../common');

const FACTORY_DIR = '/factory/';
const SCHEMAS     = 'Schemas.js'

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (BaseFactory, enumUtil) {
  var imports = Object.create(Object.prototype);
  var serverImports   = yield enumUtil.getAllImports(SERVER_DIR, [FACTORY_DIR]);
  var commmonImports  = yield enumUtil.getAllImports(COMMON_DIR, [SCHEMAS, FACTORY_DIR]);

  Object.assign(imports, serverImports);
  Object.assign(imports, commmonImports);

  ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);
  
  var baseFactory = Object.create(BaseFactory.prototype);
  baseFactory.generateFactory.call(this, imports);

  Object.setPrototypeOf(ObjectFactory.prototype, BaseFactory.prototype);
});

module.exports = ObjectFactory;
