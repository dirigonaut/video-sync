const Promise   = require('bluebird');
const Path      = require('path');

const SERVER_DIR  = Path.join(__dirname, '../../server');
const COMMON_DIR  = Path.join(__dirname, '../../common');

const FACTORY_DIR = '/factory/';
const SCHEMAS     = 'Schemas.js'

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (baseFactory, enumUtil) {
  var imports = Object.create(Object.prototype);
  var serverImports   = yield enumUtil.getAllImports(SERVER_DIR, [FACTORY_DIR]);
  var commmonImports  = yield enumUtil.getAllImports(COMMON_DIR, [SCHEMAS, FACTORY_DIR]);

  Object.assign(imports, serverImports);
  Object.assign(imports, commmonImports);
  ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);

  baseFactory.generateObjects.call(this, imports);
});

module.exports = ObjectFactory;
