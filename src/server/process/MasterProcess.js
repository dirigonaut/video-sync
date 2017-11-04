const Promise = require('bluebird');
const Cluster = require('cluster');

var redisServer, serverProcess, stateProcess, proxy, log;

process.on('uncaughtException', function (err) {
  if(log) {
    log.error(err);
  } else {
    console.error('UNCAUGHT EXCEPTION:', err);
  }
});

function MasterProcess() { }

MasterProcess.prototype.initialize = function(force) {
  if(typeof MasterProcess.prototype.protoInit === 'undefined') {
    MasterProcess.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

MasterProcess.prototype.start = Promise.coroutine(function* () {
  if(Cluster.isMaster) {
    yield startMaster.apply(this);
  } else if(process.env.processType === 'stateProcess') {
    startState.apply(this);
  } else if(process.env.processType === 'serverProcess') {
    yield startServer.apply(this);
  }
});

module.exports = MasterProcess;

var startMaster = Promise.coroutine(function* () {
  log.info(`Master ${process.pid} is running`);
  var numCPUs = require('os').cpus().length - 1;
  var workerIndex = 0;

  proxy = this.factory.createProxy();
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
      } else if(message === 'master-process:shutdown') {
        process.exit(0);
      }
    });
  });

  redisServer = this.factory.createRedisServer();
  yield redisServer.start();

  var stateWorker = Cluster.fork({processType: 'stateProcess'});

  stateWorker.on('exit', function(code, signal) {
    log.error('State worker exited, app is now in non recoverable state.');
  });

  stateWorker.on('message', function(message) {
    if(message[0] === 'state-process:started') {
      log.info(`state-started with pid: ${message[1]}`);
      log.info('starting server threads');
      proxy.setOnConnect(numCPUs);
      proxy.spawnWorker(workerIndex);
    }
  });
});

var startState = function() {
  stateProcess = this.factory.createStateProcess();
  stateProcess.start();

  log.info(`State Process: ${process.pid} started`);
  process.send(['state-process:started', process.pid]);
};

var startServer = Promise.coroutine(function* () {
  log.info(`Launching server Process: ${process.pid}`);
  serverProcess = this.factory.createServerProcess();
  proxy = this.factory.createProxy();

  yield serverProcess.start();

  proxy.forwardWorker(serverProcess.getServer());
  log.info(`Started server Process: ${process.pid}`);
  process.send('server-process:started');
});
