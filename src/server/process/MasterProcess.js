const Promise = require('bluebird');
const Cluster = require('cluster');

const RedisServer   = require('./redis/RedisServer');
const StateProcess  = require('./StateProcess');
const ServerProcess = require('./ServerProcess');
const Proxy         = require('./../utils/Proxy');

var redisServer;
var serverProcess;
var stateProcess;
var proxy;
var log;

process.on('uncaughtException', function (err) {
  if(log) {
    log.error(err);
  } else {
    console.error('UNCAUGHT EXCEPTION:', err);
  }
});

class MasterProcess { }

MasterProcess.prototype.start = Promise.coroutine(function* () {
  this.logManager.initialize(this.config);
  this.logManager.addFileLogging();

  log = this.logManager.getLog(this.logManager.LogEnum.GENERAL);

  if(Cluster.isMaster) {
    startMaster();
  } else if(process.env.processType === 'stateProcess') {
    startState();
  } else if(process.env.processType === 'serverProcess') {
    startServer();
  }
});

MasterProcess.prototype.getLog = function() {
  return log;
};

module.exports = MasterProcess;

var startMaster = Promise.coroutine(function* () {
  log.info(`Master ${process.pid} is running`);
  var numCPUs = require('os').cpus().length - 1;
  var workerIndex = 0;

  proxy = new Proxy();
  proxy.on('server-started', function(worker, index) {
    log.info(`server-started at index: ${index} with pid: ${worker.process.pid}`);
    worker.on('message', function(message) {
      if(message === 'server-process:started') {
        ++workerIndex;

        if(workerIndex >= numCPUs) {
          log.info('starting proxy');
          proxy.start();
        } else {
          proxy.spawnWorker(workerIndex);
        }
      }
    });
  });

  redisServer = new RedisServer();
  yield redisServer.start();

  var stateWorker = Cluster.fork({processType: 'stateProcess'});

  stateWorker.on('exit', function(code, signal) {
    log.error('State worker exited, app is now in non recoverable state.');
  });

  stateWorker.on('message', function(message) {
    if(message === 'state-process:started') {
      log.info('starting servers');
      proxy.initialize(numCPUs);
      proxy.spawnWorker(workerIndex);
    }
  });
});

var startState = function() {
  stateProcess = new StateProcess();
  stateProcess.initialize();

  log.info(`State Process: ${process.pid} started`);
  process.send('state-process:started');
};

var startServer = Promise.coroutine(function* () {
  log.info(`Launching server Process: ${process.pid}`);
  serverProcess = new ServerProcess();
  proxy = new Proxy();

  yield serverProcess.initialize();

  proxy.forwardWorker(serverProcess.getServer());
  log.info(`Started server Process: ${process.pid}`);
  process.send('server-process:started');
});
