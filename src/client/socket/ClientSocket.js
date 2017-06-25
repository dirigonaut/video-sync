var io 		= require('socket.io-client');
var async = require('async');

var ClientLog 	= require('../log/ClientLogManager');
var log         = ClientLog.getLog(ClientLog.LogEnum.CLIENT);

var socket;

function ClientSocket() {
}

ClientSocket.prototype.connect = function(serverUrl, callback) {
	log.info("Socket connecting to: " + serverUrl);

	socket = io.connect(serverUrl, {rejectUnauthorized: false});

	socket.on('connected', function(acknowledge) {
		log.info("Socket connected to server.");
	});

	socket.on('authenticated', function(acknowledge) {
		log.info("Socket authenticated with server." );
		callback(acknowledge);
	});
};

ClientSocket.prototype.sendRequest = function(event, request, isPromised) {
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

ClientSocket.prototype.getSocketId = function() {
	return socket.id;
};

ClientSocket.prototype.buildServerUrl = function(window) {
  return window.location.host;
};

module.exports = ClientSocket;
