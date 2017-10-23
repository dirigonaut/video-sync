const Promise = require('bluebird');
const Io 			= require('socket.io-client');
const Events  = require('events');

const TIMEOUT = 5000;

var socket, eventKeys, log;

function ClientSocket() { }

ClientSocket.prototype.initialize = function() {
	if(typeof ClientSocket.prototype.protoInit === 'undefined') {
		ClientSocket.prototype.protoInit = true;
		ClientSocket.prototype.events =  Object.create(Events.prototype);
		eventKeys = this.factory.createKeys();

		var logManager = this.factory.createClientLogManager();
		log = logManager.getLog(logManager.Enums.LOGS.GENERAL);
	}
};

ClientSocket.prototype.connectAsync = function(serverUrl, authToken) {
	if(!socket) {
		log.info(`Socket connecting to: ${serverUrl} with token: `, authToken);
		authToken = typeof authToken === 'object' ? JSON.stringify(authToken) : authToken;

		socket = Io.connect(`${serverUrl}`, {
			rejectUnauthorized: true,
			query: { token: encodeURIComponent(authToken) }
	  });

		socket.once(eventKeys.DISCONNECT, function() {
			log.info(`Disconnected from ${serverUrl}`);
			ClientSocket.prototype.events.emit(ClientSocket.Enum.Events.DISCONNECT);
		});

		return new Promise(function(resolve, reject) {
			var rejectRequest = setTimeout(function(err) {
				reject(err);
			}, TIMEOUT, `Connection attempt to server: ${serverUrl}, timed out.`);

	    socket.once(eventKeys.AUTHENTICATED, function(isAdmin, callback) {
				clearTimeout(rejectRequest);
				resolve([callback, isAdmin]);
			});

			socket.once('error', function(error) {
				socket = undefined;
				clearTimeout(rejectRequest);
				reject(error);
			});
	  });
	} else {
		return Promise.reject(`Already connected to server: ${serverUrl}`);
	}
};

ClientSocket.prototype.requestAsync = function(requestId, responseId, request) {
	if(socket && socket.connected) {
		socket.emit(requestId, request);

		return new Promise(function(resolve, reject) {
			var rejectRequest = setTimeout(function(err) {
				reject(err);
			}, TIMEOUT, `Request for Key: ${requestId}, timed out.`);

	    socket.once(responseId, function(response) {
				clearTimeout(rejectRequest);
				resolve(response);
			});
	  });
	} else {
		return Promise.reject(`Socket is not defined failing request: ${requestId}`);
	}
};

ClientSocket.prototype.request = function(event, request) {
	if(socket && socket.connected) {
		socket.emit(event, request);
	} else {
		log.warn(`socket is undefined, and thus unable to send event: ${event}`);
	}
};

ClientSocket.prototype.setEvent = function(event, callback) {
	if(socket && socket.connected) {
		socket.on(event, callback);
	} else {
		log.warn(`Socket is undefined, and thus unable to set event: ${event}`);
	}
};

ClientSocket.prototype.removeEvent = function(event, callback) {
	if(socket && socket.connected) {
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

ClientSocket.Enum = {};
ClientSocket.Enum.Events = { DISCONNECT: 'socket-disconnect' };
