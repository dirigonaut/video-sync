const Promise = require('bluebird');
const Io 			= require('socket.io-client');
const Events  = require('events');

const TIMEOUT = 5000;

var socket, wrapper, eventKeys, log;

function ClientSocket() { }

ClientSocket.prototype.initialize = function() {
	if(typeof ClientSocket.prototype.protoInit === 'undefined') {
		ClientSocket.prototype.protoInit 	= true;
		ClientSocket.prototype.events 		=  Object.create(Events.prototype);

		eventKeys = this.factory.createKeys();

		wrapper		= Object.create(Wrapper.prototype);
		wrapper.initialize();

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

		socket.on(eventKeys.DISCONNECT, function() {
			log.info(`${ClientSocket.Enum.Events.DISCONNECT} from ${serverUrl}`);
			this.events.emit(ClientSocket.Enum.Events.DISCONNECT);

			socket.once(eventKeys.AUTHENTICATED, function(isAdmin, callback) {
				log.info(`${ClientSocket.Enum.Events.RECONNECT} from ${serverUrl}`);
				this.events.emit(ClientSocket.Enum.Events.RECONNECT, [callback, isAdmin]);
			}.bind(this));

			setTimeout(function() {
				if(!socket || !socket.connected) {
					socket = undefined;
					ClientSocket.prototype.events.emit(ClientSocket.Enum.Events.ERROR);
				}
			}.bind(this), 10000);
		}.bind(this));

		return new Promise(function(resolve, reject) {
			var rejectRequest = setTimeout(function(err) {
				reject(err);
			}, TIMEOUT, `Connection attempt to server: ${serverUrl}, timed out.`);

	    socket.once(eventKeys.AUTHENTICATED, function(isAdmin, callback) {
				wrapper.setSocket(socket);
				clearTimeout(rejectRequest);
				resolve([callback, isAdmin]);
			});

			socket.once(eventKeys.ERROR, function(error) {
				socket = undefined;
				clearTimeout(rejectRequest);
				reject(error);
			}.bind(this));
	  }.bind(this));
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
		return Promise.reject(`Socket is not connected failing request: ${requestId}`);
	}
};

ClientSocket.prototype.request = function(event, request) {
	if(socket && socket.connected) {
		socket.emit(event, request);
	} else {
		log.warn(`socket is disconnected, and thus unable to send event: ${event}`);
	}
};

ClientSocket.prototype.setEvent = function(event, callback) {
	wrapper.setEvent(event, callback);
};

ClientSocket.prototype.removeEvent = function(event, callback) {
	wrapper.removeEvent(event, callback);
};

module.exports = ClientSocket;

ClientSocket.Enum = { };
ClientSocket.Enum.Events = { DISCONNECT: 'socket-disconnect', RECONNECT: 'socket-reconnect', ERROR: 'socket-error'};

function Wrapper() { }

Wrapper.prototype.initialize = function() {
	Object.setPrototypeOf(Wrapper.prototype, Events.prototype);
	Wrapper.prototype.events = new Set();
};

Wrapper.prototype.setEvent = function(event, callback) {
	this.on(event, function(args) {
		callback.apply(null, args);
	});

	if(!this.events.has(event)) {
		this.socket.on(event, function() {
			echo.call(this, event, arguments);
		}.bind(this));

		this.events.add(event);
	}
};

Wrapper.prototype.removeEvent = function(event, callback) {
	if(typeof callback === 'function') {
		this.removeListener(event, callback);
	} else {
		this.removeAllListeners(event);
	}

	if(this.listeners(event).length < 1) {
		this.socket.off(event);
		this.events.delete(event);
	}
};

Wrapper.prototype.setSocket = function(socketToWrap) {
	Wrapper.prototype.socket = socketToWrap;

	this.events.forEach(function(event) {
		this.socket.on(event, function() {
			echo.call(this, event, arguments);
		}.bind(this));
	}.bind(this));
};

var echo = function(event, parameters) {
	var args = Array.from(parameters);
	this.emit(event, args);
};
