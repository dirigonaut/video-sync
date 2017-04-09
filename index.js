var Cluster = require('cluster');
var Os      = require('os');
var Path    = require('path');

var ServerProcess = require('./src/server/process/ServerProcess.js');
var StateProcess = require('./src/server/process/StateProcess.js');

var serverProcess = null;
var stateProcess = null;

const STATIC_PATH = "static";

var appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + '/.config')
appData += '/video-sync/Default/';

if (Cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  stateProcess = new StateProcess(appData);

  for (let i = 0; i < Os.cpus().length - 1; i++) {
    Cluster.fork();
  }

  Cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  serverProcess = new ServerProcess('192.168.1.149', 8080, appData, STATIC_PATH);
  console.log(`Worker ${process.pid} started`);
}
