const Events  = require('events');
const Cluster = require('cluster');
const Net     = require('net');

var config, proxyServer, workers, log;

function Proxy() { }

Proxy.prototype.initialize = function() {
  if(typeof Proxy.prototype.protoInit === 'undefined') {
    Proxy.prototype.protoInit = true;
    Object.setPrototypeOf(Proxy.prototype, Events.prototype);

    config          = this.factory.createConfig();
    workers         = [];

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

Proxy.prototype.setOnConnect = function(numProcesses) {
  var getWorkerIndex = function(ip, len) {
    var s = '';
    for (let i = 0, _len = ip.length; i < _len; i++) {
      if (!isNaN(ip[i])) {
        s += ip[i];
      }
    }

    return Number(s) % len;
  };

  // Create the outside facing server listening on our port.
  proxyServer = Net.createServer({ pauseOnConnect: true }, function(connection) {
    var worker = workers[getWorkerIndex(connection.remoteAddress, numProcesses)];
    worker.send('sticky-media:connection', connection);
  });
};

Proxy.prototype.spawnWorker = function(index) {
	workers[index] = Cluster.fork({processType: 'serverProcess'});

	workers[index].on('exit', function(code, signal) {
		log.info('respawning worker', index);
		spawnWorker(index);
	});

  this.emit('server-started', workers[index], index);
};

Proxy.prototype.forwardWorker = function(server) {
  process.on('message', function(message, connection) {
    if (message !== 'sticky-media:connection') {
      return;
    }

    //Forward Connection to appropriate server process
    server.emit('connection', connection);
    connection.resume();
  });
};

Proxy.prototype.start = function() {
  proxyServer.listen(config.getConfig().port);
}

module.exports = Proxy;
