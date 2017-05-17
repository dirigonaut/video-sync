var Cluster = require('cluster');
var Os      = require('os');
var Fs      = require('fs');

var LogManager  = require('./src/server/log/LogManager');
var Config      = require('./src/server/utils/Config');

var logManager = new LogManager();

var redisServer   = null;
var serverProcess = null;
var stateProcess  = null;

var config = new Config();

process.on('uncaughtException', function (err) {
    console.log('UNCAUGHT EXCEPTION - keeping process alive:', err); // err.message is "foobar"
});

var configLoaded = function() {
  logManager.initialize(config);
  logManager.addFileLogging();

  if (Cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    var RedisServer   = require('./src/server/process/redis/RedisServer');

    var startClusters = function() {
      var StateProcess  = require('./src/server/process/StateProcess');
      stateProcess = new StateProcess();

      for (let i = 0; i < 1; i++) {
        Cluster.fork();
      }

      Cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
      });
    }

    redisServer = new RedisServer();
    redisServer.start(startClusters);
  } else {
    var ServerProcess = require('./src/server/process/ServerProcess');

    serverProcess = new ServerProcess();
    console.log(`Worker ${process.pid} started`);
  }
};

config.initialize(configLoaded);
