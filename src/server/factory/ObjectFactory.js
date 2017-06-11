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

var fileUtils = new FileUtils();

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* () {
  imports = yield getAllImports(ROOT_DIR);
  this.Enum = Object.getOwnPropertyNames(imports);
});

ObjectFactory.prototype.createStateEngine = function() {
  var dependency = Object.create(DependencyFactory.prototype);
  var dependencies = dependency.addFactory()
                              .addSession()
                              .addPublisher()
                              .getDependencies();

  var StateEngine = require(imports[ObjectFactory.Enum.STATE_ENGINE]);
  var stateEngine = new StateEngine(dependencies);

  Object.assign(stateEngine, dependencies);

  return stateEngine;
};

ObjectFactory.prototype.createMasterProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addFactory();
  dependency.addLog();

  var dependencies = dependency.getDependencies();

  var MasterProcess = require(imports[ObjectFactory.Enum.MASTER_PROCESS]);
  var masterProcess = new MasterProcess();

  Object.assign(masterProcess, dependencies);

  return masterProcess;
});

ObjectFactory.prototype.createProxy = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var dependencies = dependency.getDependencies();

  var Proxy = require(imports[ObjectFactory.Enum.PROXY]);
  var proxy = new Proxy();

  Object.assign(proxy, dependencies);

  return proxy;
});

ObjectFactory.prototype.createRedisServer = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var dependencies = dependency.getDependencies();

  var RedisServer = require(imports[ObjectFactory.Enum.REDIS_SERVER]);
  var redisServer = new RedisServer();

  Object.assign(redisServer, dependencies);

  return redisServer;
});

ObjectFactory.prototype.createStateProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var dependencies = dependency.getDependencies();

  var StateProcess = require(imports[ObjectFactory.Enum.STATE_PROCESS]);
  var stateProcess = new StateProcess();

  Object.assign(stateProcess, dependencies);

  return stateProcess;
});

ObjectFactory.prototype.createServerProcess = Promise.coroutine(function* () {
  var ServerProcess = require(imports[ObjectFactory.Enum.SERVER_PROCCESS]);
  var serverProcess = new ServerProcess();

  return serverProcess;
});

ObjectFactory.Enum = { MASTER_PROCESS: "MasterProcess", STATE_ENGINE: "StateEngine", PROXY:"Proxy", REDIS_SERVER: "RedisServer", STATE_PROCESS: "StateProcess", SERVER_PROCCESS: "ServerProcess"};
module.exports = ObjectFactory;

var getAllImports = function (path) {
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
