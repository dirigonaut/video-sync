const Promise   = require('bluebird');
const Path      = require('path');

const DependencyFactory   = require('./DependencyFactory');

const ROOT_DIR  = Path.join(__dirname, "../../server");
const FACTORY_DIR = '/factory/';

var imports;

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (enumUtil, dependencyFactory) {
  imports = Object.create(Object.prototype);
  var rawImports = yield enumUtil.getAllImports(ROOT_DIR, [FACTORY_DIR]);

  Object.assign(imports, rawImports);
  imports = enumUtil.filterOut(imports, dependencyFactory.DepEnum);

  ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);
});

ObjectFactory.prototype.createStateEngine = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  var publisher     = yield this.createRedisPublisher();
  var playerManager = yield this.createPlayerManager();

  dependencies = dependency.addFactory().addSession().addLog()
                          .addCustomDep(this.Enum.REDISPUBLISHER, publisher)
                          .addCustomDep(this.Enum.PLAYERMANAGER, playerManager)
                          .getDependencies();

  var StateEngine = require(imports[this.Enum.STATEENGINE]);
  var stateEngine = Object.create(StateEngine.prototype);

  Object.assign(stateEngine, dependencies);

  return stateEngine;
});

ObjectFactory.prototype.createMasterProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addFactory().addLog();
  var dependencies = dependency.getDependencies();

  var MasterProcess = require(imports[this.Enum.MASTERPROCESS]);
  var masterProcess = new MasterProcess();

  Object.assign(masterProcess, dependencies);

  return masterProcess;
});

ObjectFactory.prototype.createProxy = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var Proxy = require(imports[this.Enum.PROXY]);
  var proxy = new Proxy();

  Object.assign(proxy, dependencies);

  return proxy;
});

ObjectFactory.prototype.createRedisServer = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var RedisServer = require(imports[this.Enum.REDISSERVER]);
  var redisServer = new RedisServer();

  Object.assign(redisServer, dependencies);

  return redisServer;
});

ObjectFactory.prototype.createStateProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory().addSession().addLog();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var StateProcess = require(imports[this.Enum.STATEPROCESS]);
  var stateProcess = Object.create(StateProcess.prototype);

  Object.assign(stateProcess, dependencies);

  return stateProcess;
});

ObjectFactory.prototype.createServerProcess = Promise.coroutine(function* () {
  var ServerProcess = require(imports[this.Enum.SERVERPROCESS]);
  var serverProcess = new ServerProcess();

  return serverProcess;
});

ObjectFactory.prototype.createStateRedis = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addFactory().addLog();
  var dependencies = dependency.getDependencies();

  var StateRedis = require(imports[this.Enum.STATEREDIS]);
  var stateRedis = Object.create(StateRedis.prototype);

  Object.assign(stateRedis, dependencies);

  return stateRedis;
});

ObjectFactory.prototype.createPlayerManager = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependencies = dependency.addFactory().addLog().getDependencies();

  var PlayerManager = require(imports[this.Enum.PLAYERMANAGER]);
  var playerManager = Object.create(PlayerManager.prototype);

  Object.assign(playerManager, dependencies);

  return playerManager;
});

ObjectFactory.prototype.createRedisPublisher = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var Publisher = require(imports[this.Enum.REDISPUBLISHER]);
  var publisher = Object.create(Publisher.prototype);

  Object.assign(publisher, dependencies);

  return publisher;
});

ObjectFactory.prototype.createPlayRule = Promise.coroutine(function* () {
  var PlayRule = require(imports[this.Enum.PLAYRULE]);
  var playRule = Object.create(PlayRule.prototype);

  return playRule;
});

ObjectFactory.prototype.createSyncRule = Promise.coroutine(function* () {
  var SyncRule = require(imports[this.Enum.SYNCRULE]);
  var syncRule = Object.create(SyncRule.prototype);

  return syncRule;
});

ObjectFactory.prototype.createSyncingRule = Promise.coroutine(function* () {
  var SyncingRule = require(imports[this.Enum.SYNCINGRULE]);
  var syncingRule = Object.create(SyncingRule.prototype);

  return syncingRule;
});

module.exports = ObjectFactory;
