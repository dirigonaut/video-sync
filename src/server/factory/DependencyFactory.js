const Promise = require('bluebird');

const Deps = {
  Factory:        require('./FactoryWrapper'),
  Session:        require('../administration/Session'),
  Config:         require('../utils/Config'),
  LogManager:     require('../log/LogManager'),
};

function DependencyFactory() { }

DependencyFactory.prototype.initialize = function(enumUtil) {
  DependencyFactory.prototype.enumUtil = enumUtil;
  DependencyFactory.prototype.DepEnum = enumUtil.createEnums(Deps);
};

DependencyFactory.prototype.addFactory = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[this.enumUtil.firstCharToLowerCase(this.DepEnum.FACTORY)]
    = Object.create(Deps.Factory.prototype).getFactory();
  return this;
};

DependencyFactory.prototype.addSession = Promise.coroutine(function* () {
  this.dependencies = initDependencies(this.dependencies);

  var dependency = Object.create(DependencyFactory.prototype);
  yield dependency.addConfig();
  dependency.addLog().addFactory();

  var session = Object.create(Deps.Session.prototype);
  this.dependencies[this.enumUtil.firstCharToLowerCase(this.DepEnum.SESSION)]
    = session;

  var deps = dependency.addFactory().getDependencies()
  Object.assign(session, deps);
  session.log = deps.logManager.getLog(deps.logManager.LogEnum.ADMINISTRATION);

  return this;
});

DependencyFactory.prototype.addConfig = Promise.coroutine(function* () {
  this.dependencies = initDependencies(this.dependencies);
  var config = new Deps.Config();

  var dependency = Object.create(DependencyFactory.prototype);

  Object.assign(config, dependency.addFactory().getDependencies());

  if(!config.isInit()) {
    yield config.initialize().catch(console.error);
  }

  this.dependencies[this.enumUtil.firstCharToLowerCase(this.DepEnum.CONFIG)]
    = config;
  return this;
});

DependencyFactory.prototype.addLog = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[this.enumUtil.firstCharToLowerCase(this.DepEnum.LOGMANAGER)]
    = new Deps.LogManager();
  return this;
};

DependencyFactory.prototype.addCustomDep = function(key, reference) {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[this.enumUtil.firstCharToLowerCase(key)] = reference;
  return this;
};

DependencyFactory.prototype.getDependencies = function() {
  return this.dependencies;
};

DependencyFactory.prototype.clearDependencies = function() {
  this.dependencies = { };
};

module.exports = DependencyFactory;

var initDependencies = function(dependencies) {
  if(!dependencies) {
    dependencies = { };
  }

  return dependencies;
};
