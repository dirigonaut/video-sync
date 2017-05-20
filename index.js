var Cluster = require('cluster');
var Fs      = require('fs');

var RedisServer   = require('./src/server/process/redis/RedisServer');
var StateProcess  = require('./src/server/process/StateProcess');
var ServerProcess = require('./src/server/process/ServerProcess');
var Proxy         = require('./src/server/utils/Proxy');
var LogManager    = require('./src/server/log/LogManager');
var Config        = require('./src/server/utils/Config');

var logManager = new LogManager();

var redisServer   = null;
var serverProcess = null;
var stateProcess  = null;
var proxy         = null;

var numCPUs = require('os').cpus().length;
var config = new Config();

process.on('uncaughtException', function (err) {
    console.log('UNCAUGHT EXCEPTION:', err);
});

var configLoaded = function() {
  logManager.initialize(config);
  logManager.addFileLogging();

  if (Cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    var startProcesses = function() {
      var stateWorker = Cluster.fork({processType: 'stateProcess'});

      stateWorker.on('exit', function(code, signal) {
        console.log('respawning state worker');
        stateWorker = Cluster.fork({processType: 'stateProcess'});
      });

      proxy = new Proxy();
      proxy.initialize(1);
    };

    redisServer = new RedisServer();
    redisServer.start(startProcesses);
  } else if(process.env.processType === 'stateProcess') {
    stateProcess = new StateProcess();
    console.log(`State Process: ${process.pid} started`);
    process.send('state-process:started');
  } else if(process.env.processType === 'serverProcess') {
    serverProcess = new ServerProcess();

    process.on('message', function(message, connection) {
      if (message !== 'sticky-session:connection') {
        return;
      }

      //Forward Connection to appropriate server process
      serverProcess.server.emit('connection', connection);
      connection.resume();
    });

    console.log(`Server Process: ${process.pid} started`);
  }
};

config.initialize(configLoaded);
