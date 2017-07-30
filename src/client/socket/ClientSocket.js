const Promise = require('bluebird');
const io 			= require('socket.io-client');
const async 	= require('async');

var socket, eventKeys, log;

function ClientSocket() { }

ClientSocket.prototype.initialize = function() {
	if(typeof ClientSocket.prototype.protoInit === 'undefined') {
		eventKeys = this.factory.createKeys();

		var logManager = this.factory.createClientLogManager();
		log = logManager.getLog(logManager.LogEnum.GENERAL);
	}
};

ClientSocket.prototype.connectAsync = function(serverUrl) {
	log.info("Socket connecting to: " + serverUrl);

	socket = io.connect(serverUrl, {rejectUnauthorized: false});

	socket.on(eventKeys.CONNECTED, function() {
		log.info("Socket connected to server.");
	});

	return new Promise(function(resolve, reject) {
    socket.once(eventKeys.AUTHENTICATED, function(isAdmin, callback) {
			socket.off(eventKeys.DISCONNECT, reject);
			resolve([callback, isAdmin]);
		});
		socket.once(eventKeys.DISCONNECT, reject);
  });
};

ClientSocket.prototype.requestAsync = function(requestId, responseId, request) {
	socket.emit(requestId, request);

	return new Promise(function(resolve, reject) {
    socket.once(responseId, function(response) {
			socket.off(eventKeys.DISCONNECT, reject);
			resolve(response);
		});
		socket.once(eventKeys.DISCONNECT, reject);
  });
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

ClientSocket.prototype.removeEvent = function(event, callback) {
	if(socket) {
		if(callback) {
			socket.off(event, callback);
		} else {
			socket.off(event);
		}
	}
};

module.exports = ClientSocket;
