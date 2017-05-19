var cluster = require('cluster');
var net     = require('net');

var Config  = require('./src/server/utils/Config');

var proxyServer = null;

function Proxy() {

}

Proxy.prototype.initialize = function(numProcesses) {
  var config = new Config();

	var workers = [];

	var spawnWorker = function(i) {
		workers[i] = cluster.fork();

		// Optional: Restart worker on exit
		workers[i].on('exit', function(code, signal) {
			console.log('respawning worker', i);
			spawnWorker(i);
		});
  };

	for (var i = 0; i < numProcesses; i++) {
		spawnWorker(i);
	}

	var getWorkerIndex = function(ip, len) {
		var s = '';
		for (var i = 0, _len = ip.length; i < _len; i++) {
			if (!isNaN(ip[i])) {
				s += ip[i];
			}
		}

		return Number(s) % len;
	};

	// Create the outside facing server listening on our port.
	proxyServer = net.createServer({ pauseOnConnect: true }, function(connection) {
		var worker = workers[getWorkerIndex(connection.remoteAddress, numProcesses)];
		worker.send('sticky-session:connection', connection);
	}).listen(config.getConfig().port);
};

module.exports = Proxy;
