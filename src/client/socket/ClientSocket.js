var io = require('socket.io-client');

var socket;

function ClientSocket() {
}

ClientSocket.prototype.connect = function(callback, serverUrl) {
	console.log("Socket connecting to: " + serverUrl);
	socket = io.connect(serverUrl, {'force new connection': true});

	socket.on('authenticated', function() {
		callback();
	});
};

ClientSocket.prototype.sendRequest = function(event, request, noLogging) {
	if(noLogging) {
		console.log(event);
		console.log(request);
	}
	socket.emit(event, request);
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

module.exports = ClientSocket;
