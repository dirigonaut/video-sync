var io = require('socket.io-client');

var socket;

function ClientSocket() {
}

ClientSocket.prototype.connect = function(serverUrl, callback) {
	console.log("Socket connecting to: " + serverUrl);

	socket = io.connect(serverUrl, {rejectUnauthorized: false});

	socket.on('authenticated', function(acknowledge) {
		console.log("Socket connected to: " + serverUrl);
		callback(acknowledge);
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

ClientSocket.prototype.buildServerUrl = function(window, port) {
  if(port != null && port != undefined) {
    return "https://127.0.0.1:" + port;
  }

  return window.location.host;
};

module.exports = ClientSocket;
