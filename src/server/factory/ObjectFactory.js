const Promise   = require("bluebird");
const Path      = require("path");

const SERVER_DIR  = Path.join(__dirname, "../../server");
const ENCODE_DIR  = Path.join(__dirname, "../../encoder");
const COMMON_DIR  = Path.join(__dirname, "../../common");

const FACTORY_DIR = "/factory/";
const SCHEMAS     = "Schemas.js"

const REGEX       = /\.js$/;

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (baseFactory, pathUtil) {
  var imports = Object.create(Object.prototype);
  var serverImports   = yield pathUtil.getAllPaths(SERVER_DIR, [FACTORY_DIR], REGEX);
  var encodeImports   = yield pathUtil.getAllPaths(ENCODE_DIR, [], REGEX);
  var commmonImports  = yield pathUtil.getAllPaths(COMMON_DIR, [SCHEMAS, FACTORY_DIR], REGEX);

  Object.assign(imports, serverImports);
  Object.assign(imports, encodeImports);
  Object.assign(imports, commmonImports);
  ObjectFactory.prototype.Enum = pathUtil.createEnums(imports);

  baseFactory.generateFactory.call(this, ObjectFactory, imports);
});

module.exports = ObjectFactory;
