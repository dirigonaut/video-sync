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

   dependency.addFactory().addLog()
        .addCustomDep(this.Enum.REDISPUBLISHER, publisher)
        .addCustomDep(this.Enum.PLAYERMANAGER, playerManager);
  yield dependency.addSession();
  var dependencies = dependency.getDependencies();

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
  var masterProcess = Obhject.create(MasterProcess.prototype);

  Object.assign(masterProcess, dependencies);

  return masterProcess;
});

ObjectFactory.prototype.createProxy = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var Proxy = require(imports[this.Enum.PROXY]);
  var proxy = Object.create(Proxy.prototype);

  Object.assign(proxy, dependencies);

  return proxy;
});

ObjectFactory.prototype.createRedisServer = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();
  console.log(dependencies)

  var RedisServer = require(imports[this.Enum.REDISSERVER]);
  var redisServer = Object.create(RedisServer.prototype);

  Object.assign(redisServer, dependencies);

  return redisServer;
});

ObjectFactory.prototype.createStateProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory().addLog();
  yield dependency.addConfig();
  yield dependency.addSession();
  var dependencies = dependency.getDependencies();

  var StateProcess = require(imports[this.Enum.STATEPROCESS]);
  var stateProcess = Object.create(StateProcess.prototype);

  Object.assign(stateProcess, dependencies);

  return stateProcess;
});

ObjectFactory.prototype.createServerProcess = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory().addLog();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var ServerProcess = require(imports[this.Enum.SERVERPROCESS]);
  var serverProcess = Object.create(ServerProcess.prototype);

  Object.assign(serverProcess, dependencies);

  return serverProcess;
});

ObjectFactory.prototype.createStateRedis = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addFactory().addLog();
  yield dependency.addSession();
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
  playerManager.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.STATE);

  return playerManager;
});

ObjectFactory.prototype.createRedisPublisher = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory().addLog();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var Publisher = require(imports[this.Enum.REDISPUBLISHER]);
  var publisher = Object.create(Publisher.prototype);

  Object.assign(publisher, dependencies);
  publisher.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.GENERAL);

  return publisher;
});

ObjectFactory.prototype.createRedisSocket = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addFactory();
  yield dependency.addConfig();
  var dependencies = dependency.getDependencies();

  var RedisSocket = require(imports[this.Enum.REDISSOCKET]);
  var redisSocket = Object.create(RedisSocket.prototype);

  Object.assign(redisSocket, dependencies);
  redisSocket.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.GENERAL);

  return redisSocket;
});

ObjectFactory.prototype.createPlayRule = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addLog();

  var PlayRule = require(imports[this.Enum.PLAYRULE]);
  var playRule = Object.create(PlayRule.prototype);

  var dependencies = dependency.getDependencies();
  cache.log
  playRule.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.STATE);

  return playRule;
});

ObjectFactory.prototype.createSyncRule = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addLog();

  var SyncRule = require(imports[this.Enum.SYNCRULE]);
  var syncRule = Object.create(SyncRule.prototype);

  syncRule.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.STATE);

  return syncRule;
});

ObjectFactory.prototype.createSyncingRule = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addLog();

  var SyncingRule = require(imports[this.Enum.SYNCINGRULE]);
  var syncingRule = Object.create(SyncingRule.prototype);

  syncingRule.log = dependencies.logManager.getLog(dependencies.logcreateCacheManager.LogEnum.STATE);

  return syncingRule;
});

ObjectFactory.prototype.createResumeRule = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependency.addLog();

  var ResumeRule = require(imports[this.Enum.RESUMERULE]);
  var resumeRule = Object.create(ResumeRule.prototype);

  resumeRule.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.STATE);

  return resumeRule;
});

ObjectFactory.prototype.createReflectiveAdapter = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();

  var ReflectiveAdapter = require(imports[this.Enum.REFLECTIVEADAPTER]);
  var reflectiveAdapter = Object.create(ReflectiveAdapter.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(reflectiveAdapter, dependencies);

  return reflectiveAdapter;
});

ObjectFactory.prototype.createCertificate = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  dependency.addLog();
  yield dependency.addConfig();

  var Certificate = require(imports[this.Enum.CERTIFICATE]);
  var certificate = Object.create(Certificate.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(certificate, dependencies);

  certificate.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.AUTHENTICATION);
  return certificate;
});

ObjectFactory.prototype.createNeDatabase = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  dependency.addLog();
  yield dependency.addConfig();

  var NeDatabase = require(imports[this.Enum.NEDATABASE]);
  var neDatabase = Object.create(NeDatabase.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(neDatabase, dependencies);

  neDatabase.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.DATABASE);
  return neDatabase;
});

//----------------------------------- Controllers -------------------------------------------
ObjectFactory.prototype.createAuthenticationController = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  dependency.addFactory().addLog();
  yield dependency.addSession();
  dependencies = dependency.getDependencies();

  var AuthenticationController = require(imports[this.Enum.AUTHENTICATIONCONTROLLER]);
  var authenticationController = Object.create(AuthenticationController.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(authenticationController, dependencies);

  authenticationController.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.AUTHENTICATION);
  return authenticationController;
});

ObjectFactory.prototype.createVideoController = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  var cache = yield this.createCache();

  dependency.addFactory().addLog()
        .addCustomDep(this.Enum.CACHE, cache);
  yield dependency.addSession();
  dependencies = dependency.getDependencies();

  var VideoController = require(imports[this.Enum.VIDEOCONTROLLER]);
  var videoController = Object.create(VideoController.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(videoController, dependencies);

  videoController.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.VIDEO);
  return videoController;
});

ObjectFactory.prototype.createDatabaseController = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);

  var cache = yield this.createCache();

  dependency.addFactory().addLog();
  yield dependency.addSession();
  dependencies = dependency.getDependencies();

  var DatabaseController = require(imports[this.Enum.DATABASECONTROLLER]);
  var databaseController = Object.create(DatabaseController.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(databaseController, dependencies);

  databaseController.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.DATABASE);
  return databaseController;
});

ObjectFactory.prototype.createCache = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  yield dependency.addSession();
  dependencies = dependency.addFactory().addLog()
                          .getDependencies();

  var Cache = require(imports[this.Enum.CACHE]);
  var cache = Object.create(Cache.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(cache, dependencies);

  cache.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.UTILS);
  return cache;
});

ObjectFactory.prototype.createFileIO = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependencies = dependency.addFactory().addLog()
                          .getDependencies();

  var FileIO = require(imports[this.Enum.FILEIO]);
  var fileIO = Object.create(FileIO.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(fileIO, dependencies);

  fileIO.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.UTILS);
  return fileIO;
});

ObjectFactory.prototype.createSmtp = Promise.coroutine(function* () {
  var dependency = Object.create(DependencyFactory.prototype);
  dependencies = dependency.addFactory().addLog()
                          .getDependencies();

  var Smtp = require(imports[this.Enum.SMTP]);
  var smtp = Object.create(Smtp.prototype);

  var dependencies = dependency.getDependencies();
  Object.assign(smtp, dependencies);

  smtp.log = dependencies.logManager.getLog(dependencies.logManager.LogEnum.ADMINISTRATION);
  return fileIO;
});

module.exports = ObjectFactory;
