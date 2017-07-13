const Promise = require('bluebird');
const io 			= require('socket.io-client');
const async 	= require('async');

var socket, log;

function ClientSocket() { }

ClientSocket.prototype.initialize = function() {
	if(typeof ClientSocket.prototype.protoInit === 'undefined') {
		var logManager = this.createClientLogManager();
		log = logManager.getLog(logManager.Enum.GENERAL);
	}
};

ClientSocket.prototype.connectAsync = function(serverUrl) {
	log.info("Socket connecting to: " + serverUrl);

	socket = io.connect(serverUrl, {rejectUnauthorized: false});

	socket.on('connected', function(acknowledge) {
		log.info("Socket connected to server.");
	});

	socket.on('authenticated', function(acknowledge) {
		log.info("Socket authenticated with server." );
		callback(acknowledge);
	});

	return
};

ClientSocket.prototype.requestAsync = function(event, request, isPromised) {
	if(isPromised) {
		async.retry({times: 10, interval: 250}, function (callback, result) {
		  socket.emit(event, request, function (err, result) {
		    if (err) {
					return callback(err);
				}

		    callback(null, result);
		  });
		},
		function (err, result) {
		   log.silly(`${event} responded with err ${err} and result ${result}`);
		});
	} else {
		socket.emit(event, request);
	}
};

ClientSocket.prototype.request = function(event, request, isPromised) {
	if(isPromised) {
		async.retry({times: 10, interval: 250}, function (callback, result) {
		  socket.emit(event, request, function (err, result) {
		    if (err) {
					return callback(err);
				}

		    callback(null, result);
		  });
		},
		function (err, result) {
		   log.silly(`${event} responded with err ${err} and result ${result}`);
		});
	} else {
		socket.emit(event, request);
	}
};

ClientSocket.prototype.setEvent = function(event, callback) {
	socket.on(event, callback);
};

ClientSocket.prototype.clearEvent = function(event, callback) {
	if(callback !== null && callback !== undefined) {
		socket.off(event, callback);
	} else {
		socket.off(event);
	}
};

module.exports = ClientSocket;
