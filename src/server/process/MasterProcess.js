const Promise = require("bluebird");
const Cluster = require("cluster");
const Path    = require("path");

var redisServer, serverProcess, stateProcess, proxy, config, log;

process.on("uncaughtException", function (err) {
  if(log) {
    log.error(err);
  } else {
    console.error("UNCAUGHT EXCEPTION:", err);
  }
});

process.on("exit", function(e) {
  if(log) {
    log.info(e);
  } else {
    console.error("EXIT:", e);
  }

  if(redisServer) {
    redisServer.stop();
  }
});

function MasterProcess() { }

MasterProcess.prototype.initialize = function(force) {
  if(typeof MasterProcess.prototype.protoInit === "undefined") {
    MasterProcess.prototype.protoInit = true;
    config          = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

MasterProcess.prototype.start = Promise.coroutine(function* () {
  if(Cluster.isMaster) {
    yield startMaster.apply(this);
  } else if(process.env.processType === "stateProcess") {
    startState.apply(this);
  } else if(process.env.processType === "serverProcess") {
    yield startServer.apply(this);
  }
});

module.exports = MasterProcess;

var startMaster = Promise.coroutine(function* () {
  log.info(`Master ${process.pid} is running`);
  var threads = config.getConfig().serverInfo.threads;
  var cpus = require("os").cpus().length === 1 ? 1 : require("os").cpus().length - 1;
  var numCPUs = threads !== undefined && threads > 0 ? threads : cpus
  var workerIndex = 0;

  proxy = this.factory.createProxy();
  proxy.on("server-started", function(worker, index) {
    log.info(`server-started at index: ${index} with pid: ${worker.process.pid}`);
    worker.on("message", function(message) {
      if(message === "server-process:started") {
        ++workerIndex;

        if(workerIndex >= numCPUs) {
          log.info("starting proxy");
          proxy.start();
        } else {
          proxy.spawnWorker(workerIndex);
        }
      } else if(message === "master-process:shutdown") {
        redisServer.stop();
        process.exit(0);
      }
    });
  });

  redisServer = this.factory.createRedisServer();
  yield redisServer.start(config.getConfig().external.redis, Path.join(config.getConfig().dirs.configDir, "redis.conf"));

  var stateWorker = Cluster.fork({processType: "stateProcess"});

  stateWorker.on("exit", function(code, signal) {
    log.error("State worker exited, app is now in non recoverable state.");
  });

  stateWorker.on("message", function(message) {
    if(message[0] === "state-process:started") {
      log.info(`state-started with pid: ${message[1]}`);
      log.info("starting server threads");
      proxy.setOnConnect(numCPUs);
      proxy.spawnWorker(workerIndex);
    }
  });
});

var startState = function() {
  log.info(`Launching state Process: ${process.pid}`);
  stateProcess = this.factory.createStateProcess();
  stateProcess.start();

  log.info(`State Process: ${process.pid} started`);
  process.send(["state-process:started", process.pid]);
};

var startServer = Promise.coroutine(function* () {
  log.info(`Launching server Process: ${process.pid}`);
  serverProcess = this.factory.createServerProcess();
  proxy = this.factory.createProxy();

  yield serverProcess.start();

  proxy.forwardWorker(serverProcess.getServer());
  log.info(`Started server Process: ${process.pid}`);
  process.send("server-process:started");
});
