var Promise = require('bluebird');
var Cluster = require('cluster');

var RedisServer   = require('./redis/RedisServer');
var StateProcess  = require('./StateProcess');
var ServerProcess = require('./ServerProcess');
var Proxy         = require('./../utils/Proxy');
var LogManager    = require('./../log/LogManager');
var Config        = require('./../utils/Config');

var logManager;
var redisServer;
var serverProcess;
var stateProcess;
var proxy;

var numCPUs = require('os').cpus().length - 1;
var startedCPUs = 0;

process.on('uncaughtException', function (err) {
  console.log('UNCAUGHT EXCEPTION:', err);
});

class MasterProcess { }

MasterProcess.prototype.start = Promise.coroutine(function* () {
  var config = new Config();
  yield config.initialize();

  logManager = new LogManager();
  logManager.initialize(config);
  logManager.addFileLogging();

  if(Cluster.isMaster) {
    yield startMaster();
  } else if(process.env.processType === 'stateProcess') {
    yield startState();
  } else if(process.env.processType === 'serverProcess') {
    yield startServer();
  }
});

var startMaster = Promise.coroutine(function* () {
  console.log(`Master ${process.pid} is running`);
  proxy = new Proxy();

  var startProcesses = function(redisUp) {
    if(redisUp) {
      var stateWorker = Cluster.fork({processType: 'stateProcess'});

      stateWorker.on('exit', function(code, signal) {
        console.error('State worker exited, app is now in non recoverable state.');
      });

      stateWorker.on('message', function(message) {
        console.log('starting servers');
        if (message === 'state-process:started') {
          proxy.initialize(numCPUs);
        }
      });
    }
  };

  proxy.on('server-started', function(worker, index) {
    console.log(`server-started at index: ${index} with pid: ${worker.process.pid}`);
    worker.on('message', function(message) {
      if(message === 'server-process:started') {
        ++startedCPUs;
        if(startedCPUs === numCPUs) {
          console.log('starting proxy');
          proxy.start();
        }
      }
    });
  });

  redisServer = new RedisServer();
  redisServer.start(startProcesses);
});

var startState = Promise.coroutine(function* () {
  stateProcess = new StateProcess();

  stateProcess.on('started', function() {
    console.log(`State Process: ${process.pid} started`);
    process.send('state-process:started');
  });

  stateProcess.initialize();
});

var startServer = Promise.coroutine(function* () {
  console.log(`Launching server Process: ${process.pid}`);
  serverProcess = new ServerProcess();

  serverProcess.on('started', function() {
    var proxy = new Proxy();
    proxy.forwardWorker(serverProcess.getServer());
    console.log(`Started server Process: ${process.pid}`);
    process.send('server-process:started');
  });

  serverProcess.initialize();
});

module.exports = MasterProcess;
