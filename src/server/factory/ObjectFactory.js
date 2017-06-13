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

ObjectFactory.prototype.createStateEngine = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  var publisher     = yield this.createRedisPublisher();
  var playerManager = yield this.createPlayerManager();

  dependencies = dependency.addFactory().addSession().addLog()
                          .addCustomDep(this.enum.REDISPUBLISHER, publisher)
                          .addCustomDep(this.enum.PLAYERMANAGER, playerManager)
                          .getDependencies();

  var StateEngine = require(imports[this.enum.STATEENGINE]);
  var stateEngine = Object.create(StateEngine.prototype);

  Object.assign(stateEngine, dependencies);

  return stateEngine;
});

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
  dependency.addFactory().addSession().addLog();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var StateProcess = require(imports[this.enum.STATEPROCESS]);
  var stateProcess = Object.create(StateProcess.prototype);

  Object.assign(stateProcess, dependencies);

  return stateProcess;
});

ObjectFactory.prototype.createServerProcess = Promise.coroutine(function* () {
  var ServerProcess = require(imports[this.enum.SERVERPROCESS]);
  var serverProcess = new ServerProcess();

  return serverProcess;
});

ObjectFactory.prototype.createStateRedis = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addFactory().addLog();
  var dependencies = dependency.getDependencies();

  var StateRedis = require(imports[this.enum.STATEREDIS]);
  var stateRedis = Object.create(StateRedis.prototype);

  Object.assign(stateRedis, dependencies);

  return stateRedis;
});

ObjectFactory.prototype.createPlayerManager = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependencies = dependency.addFactory().addLog().getDependencies();

  var PlayerManager = require(imports[this.enum.PLAYERMANAGER]);
  var playerManager = Object.create(PlayerManager.prototype);

  Object.assign(playerManager, dependencies);

  return playerManager;
});

ObjectFactory.prototype.createRedisPublisher = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var Publisher = require(imports[this.enum.REDISPUBLISHER]);
  var publisher = Object.create(Publisher.prototype);

  Object.assign(publisher, dependencies);

  return publisher;
});

ObjectFactory.prototype.createPlayRule = Promise.coroutine(function* () {
  var PlayRule = require(imports[this.enum.PLAYRULE]);
  var playRule = Object.create(PlayRule.prototype);

  return playRule;
});

ObjectFactory.prototype.createSyncRule = Promise.coroutine(function* () {
  var SyncRule = require(imports[this.enum.SYNCRULE]);
  var syncRule = Object.create(SyncRule.prototype);

  return syncRule;
});

ObjectFactory.prototype.createSyncingRule = Promise.coroutine(function* () {
  var SyncingRule = require(imports[this.enum.SYNCINGRULE]);
  var syncingRule = Object.create(SyncingRule.prototype);

  return syncingRule;
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
