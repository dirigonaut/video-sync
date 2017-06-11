const Promise         = require('bluebird');
const FactoryWrapper  = require('./FactoryWrapper');
const Session         = require('../administration/Session');
const Config          = require('../utils/Config');
const LogManager      = require('../log/LogManager');
const Publisher       = require('../process/redis/RedisPublisher');
const RedisSocket     = require('../process/redis/RedisSocket');
const Validator       = require('../authentication/Validator');

function DependencyFactory() { }

DependencyFactory.prototype.addFactory = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(DependencyFactory.Enum.FACTORY)] =  Object.create(FactoryWrapper.prototype);
  return this;
};

DependencyFactory.prototype.addSession = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(DependencyFactory.Enum.SESSION)] = new Session();
  return this;
};

DependencyFactory.prototype.addConfig = Promise.coroutine(function* () {
  this.dependencies = initDependencies(this.dependencies);
  var config = new Config();

  if(!config.isInit()) {
    yield config.initialize().catch(console.error);
  }

  this.dependencies[format(DependencyFactory.Enum.CONFIG)]  = config;
  return this;
});

DependencyFactory.prototype.addLog = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(DependencyFactory.Enum.LOG)] = new LogManager();
  return this;
};

DependencyFactory.prototype.addPublisher = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(DependencyFactory.Enum.PUBLISHER)] = new Publisher();
  return this;
};

DependencyFactory.prototype.addRedisSocket = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(DependencyFactory.Enum.SOCKET)] = new RedisSocket();
  return this;
};

DependencyFactory.prototype.addValidator = function() {
  this.dependencies = initDependencies(this.dependencies);
  this.dependencies[format(DependencyFactory.Enum.VALIDATOR)] = new Validator();
  return this;
};

DependencyFactory.prototype.getDependencies = function() {
  return this.dependencies;
};

DependencyFactory.Enum = { FACTORY: "FactoryWrapper", SESSION: "Session", CONFIG: "Config", LOG: "LogManager", PUBLISHER: "RedisPublisher", SOCKET: "RedisSocket", VALIDATOR: "Validator"};

module.exports = DependencyFactory;

var initDependencies = function(dependencies) {
  if(!dependencies) {
    dependencies = { };
    dependencies.enums = DependencyFactory.Enum;
  }

  return dependencies;
};

var format = function(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}
