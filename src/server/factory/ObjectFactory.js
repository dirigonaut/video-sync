const Promise   = require('bluebird');
const Find      = require('find');
const Path      = require('path');
const Events    = require('events');
const Fs        = Promise.promisifyAll(require('fs'));

const FileUtils = require('../utils/FileSystemUtils');
const DependencyFactory = require('./DependencyFactory');

const ROOT_DIR  = Path.join(__dirname, "../../server");
const FACTORY_DIR = '/factory/';

var imports = { };

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* () {
  imports = yield getAllImports(ROOT_DIR);
  this.enum = createEnums(imports);
});

ObjectFactory.prototype.createStateEngine = function() {
  var dependency = Object.create(DependencyFactory.prototype);
  var dependencies = dependency.addFactory()
                              .addSession()
                              .addPublisher()
                              .getDependencies();

  var StateEngine = require(imports[this.enum.STATEENGINE]);
  var stateEngine = new StateEngine(dependencies);

  Object.assign(stateEngine, dependencies);

  return stateEngine;
};

ObjectFactory.prototype.createMasterProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addFactory().addLog();

  var dependencies = dependency.getDependencies();

  var MasterProcess = require(imports[this.enum.MASTERPROCESS]);
  var masterProcess = new MasterProcess();

  Object.assign(masterProcess, dependencies);

  return masterProcess;
});

ObjectFactory.prototype.createProxy = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var dependencies = dependency.getDependencies();

  var Proxy = require(imports[this.enum.PROXY]);
  var proxy = new Proxy();

  Object.assign(proxy, dependencies);

  return proxy;
});

ObjectFactory.prototype.createRedisServer = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var dependencies = dependency.getDependencies();

  var RedisServer = require(imports[this.enum.REDISSERVER]);
  var redisServer = new RedisServer();

  Object.assign(redisServer, dependencies);

  return redisServer;
});

ObjectFactory.prototype.createStateProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var dependencies = dependency.getDependencies();

  var StateProcess = require(imports[this.enum.STATEPROCESS]);
  var stateProcess = new StateProcess();

  Object.assign(stateProcess, dependencies);

  return stateProcess;
});

ObjectFactory.prototype.createServerProcess = Promise.coroutine(function* () {
  var ServerProcess = require(imports[this.enum.SERVERPROCESS]);
  var serverProcess = new ServerProcess();

  return serverProcess;
});

module.exports = ObjectFactory;

var getAllImports = function (path) {
  var fileUtils = new FileUtils();

  var imports = {};

  var asyncEmitter = new Events();
  var finished = "finished";
  var error = "error";

  Find.eachfile(/\.js$/, path, function(filePath) {
    if(filePath) {
      var key = fileUtils.splitNameFromPath(filePath);

      if(!filePath.includes(FACTORY_DIR)) {
        imports[key] = filePath;
      }
    }
  })
  .end(function() {
    for(let property in DependencyFactory.Enum) {
      if(DependencyFactory.Enum.hasOwnProperty(property)) {
        delete imports[DependencyFactory.Enum[property]];
      }
    };

    asyncEmitter.emit(finished, imports);
  })
  .error(function(err) {
    asyncEmitter.emit(error, err);
  });

  return new Promise(function(resolve, reject) {
    asyncEmitter.once(finished, resolve);
    asyncEmitter.once(error, reject);
  });
};

var createEnums = function(object) {
  var keys = Object.keys(object);
  var enums = { };

  for(let i = 0; i < keys.length; ++i) {
    enums[keys[i].toUpperCase()] = keys[i];
  }

  return enums;
};
