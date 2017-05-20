var Cluster = require('cluster');
var Net     = require('net');

var Config  = require('./Config');

var proxyServer = null;
var workers = [];

class Proxy {
  initialize(numProcesses) {
    var config = new Config();
    var port = config.getConfig().port;

    for (let i = 0; i < numProcesses; i++) {
      this.spawnWorker(i);
    }

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
      var index = getWorkerIndex(connection.remoteAddress, numProcesses);
  		var worker = workers[index];

      console.log(`Address: ${connection.remoteAddress} is being forwarded to process: ${index}`);
  		worker.send('sticky-session:connection', connection);
  	}).listen(port);
  }

  spawnWorker(index) {
		workers[index] = Cluster.fork({processType: 'serverProcess'});

		// Optional: Restart worker on exit
		workers[index].on('exit', function(code, signal) {
			console.log('respawning worker', index);
			spawnWorker(index);
		});
  }

  forwardWorker(server) {
    process.on('message', function(message, connection) {
      if (message !== 'sticky-session:connection') {
        return;
      }

      //Forward Connection to appropriate server process
      server.emit('connection', connection);
      connection.resume();
    });
  }
}

module.exports = Proxy;
