var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var Path = require('path');
var Server = require('./src/server/Server.js');
var server = null;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < 1; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  var appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + '/.config')
  appData += '/video-sync/Default/';
  console.log(appData);

  var staticPath = Path.join(__dirname, "static");
  console.log(staticPath);

  server = new Server('192.168.1.149', 8080, appData, "static");
  console.log(`Worker ${process.pid} started`);
}
