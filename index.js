var Cluster = require('cluster');
var Os      = require('os');
var Fs      = require('fs');

var Config  = require('./src/server/utils/Config');

var RedisServer   = require('./src/server/process/redis/RedisServer');
var ServerProcess = require('./src/server/process/ServerProcess');
var StateProcess  = require('./src/server/process/StateProcess');

var redisServer   = null;
var serverProcess = null;
var stateProcess  = null;

var config = new Config();

var configLoaded = function() {
  if (Cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    var startClusters = function() {
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
    serverProcess = new ServerProcess();
    console.log(`Worker ${process.pid} started`);
  }
};

config.initialize(configLoaded);
