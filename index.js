var Cluster = require('cluster');
var Os      = require('os');
var Fs      = require('fs');
var Path    = require('path');

var RedisServer   = require('./src/server/process/redis/RedisServer');
var ServerProcess = require('./src/server/process/ServerProcess');
var StateProcess  = require('./src/server/process/StateProcess');

var redisServer   = null;
var serverProcess = null;
var stateProcess  = null;

const STATIC_PATH = "static";

var appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + '/.config')
appData += '/video-sync/Default/';

var config = Fs.readFileSync(`${appData}/config.json`);
config = JSON.parse(config);

if (Cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  var startClusters = function() {
    stateProcess = new StateProcess(appData);

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
  serverProcess = new ServerProcess(config.host, config.port, appData, STATIC_PATH);
  console.log(`Worker ${process.pid} started`);
}
