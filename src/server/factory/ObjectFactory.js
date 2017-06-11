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
  dependency.addSession();

  var dependencies = dependency.getDependencies();

  var MasterProcess = require(imports[ObjectFactory.Enum.MASTER_PROCESS]);
  var masterProcess = new MasterProcess();

  Object.assign(masterProcess, dependencies);

  return masterProcess;
});

ObjectFactory.Enum = { MASTER_PROCESS: "MasterProcess", STATE_ENGINE: "StateEngine"}
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
