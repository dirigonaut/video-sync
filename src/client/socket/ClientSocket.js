const Promise = require('bluebird');
const Io 			= require('socket.io-client');
const Events  = require('events');

var socket, eventKeys, log;

function ClientSocket() { }

ClientSocket.prototype.initialize = function() {
	if(typeof ClientSocket.prototype.protoInit === 'undefined') {
		ClientSocket.prototype.protoInit = true;
		Object.setPrototypeOf(ClientSocket.prototype, Events.prototype);
		eventKeys = this.factory.createKeys();

		var logManager = this.factory.createClientLogManager();
		log = logManager.getLog(logManager.Enums.LOGS.GENERAL);
	}
};

ClientSocket.prototype.connectAsync = function(serverUrl, token) {
	log.info(`Socket connecting to: ${serverUrl} with token: `, token);
	socket = Io.connect(`${serverUrl}`, {
		rejectUnauthorized: true,
		query: { token: encodeURIComponent(token) }
  });

	return new Promise(function(resolve, reject) {
    socket.once(eventKeys.AUTHENTICATED, function(isAdmin, callback) {
			resolve([callback, isAdmin]);
		});

		socket.once('error', reject);
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
	socket.emit(event, request);
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
	} else {
		log.warn(`socket is undefined, and thus unable to remove event: ${event}`);
	}
};

module.exports = ClientSocket;
