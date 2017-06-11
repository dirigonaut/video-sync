const Promise = require('bluebird');

const Deps = {
  Factory:        require('./FactoryWrapper'),
  Session:        require('../administration/Session'),
  Config:         require('../utils/Config'),
  LogManager:     require('../log/LogManager'),
};

var depsEnum;

function DependencyFactory() { }

DependencyFactory.prototype.initialize = function() {
  depsEnum = createEnums(Deps);
};

DependencyFactory.prototype.addFactory = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(depsEnum.FACTORY)] = Object.create(Deps.Factory.prototype).getFactory();
  return this;
};

DependencyFactory.prototype.addSession = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(depsEnum.SESSION)] = new Deps.Session();
  return this;
};

DependencyFactory.prototype.addConfig = Promise.coroutine(function* () {
  this.dependencies = initDependencies(this.dependencies);
  var config = new Deps.Config();

  if(!config.isInit()) {
    yield config.initialize().catch(console.error);
  }

  this.dependencies[format(depsEnum.CONFIG)]  = config;
  return this;
});

DependencyFactory.prototype.addLog = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(depsEnum.LOGMANAGER)] = new Deps.LogManager();
  return this;
};

DependencyFactory.prototype.addCustomDep = function(key, reference) {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(key)] = reference;
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

var format = function(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

var createEnums = function(object) {
  var keys = Object.keys(object);
  var enums = { };

  for(let i = 0; i < keys.length; ++i) {
    enums[keys[i].toUpperCase()] = keys[i];
  }

  return enums;
};
