var io = require('socket.io-client');

var fileBuffer;
var playerController;

var serverUrl;
var socket;

function ClientSocket(callback, flag) {
	if(flag) {
		serverUrl = "http://192.168.1.147:8080";
	} else {
		serverUrl = "http://localhost:8080";
	}
	console.log(serverUrl);
	socket = io.connect(serverUrl, {'force new connection': true});
	socket.on('connected', function() {
		registerEvents();
		callback()
	});
}

ClientSocket.sendRequest = function(event, request) {
	console.log(event);
	console.log(request);
	socket.emit(event, request);
};

ClientSocket.prototype.initialize = function(pController, fBuffer) {
	playerController = pController;
	fileBuffer = fBuffer;
}

module.exports = ClientSocket;

function registerEvents() {
	//Socket On
	socket.on('state', function (response , callback) {
		console.log(response.id + " recived: " + response.command);
		callback({"id" : response.id, "command" : response.command});
	});

	socket.on('all-smtp', function (response){
		console.log(response);
	});

	socket.on('file-register-response', function(response, callback){
	  console.log('file-register-response');
		fileBuffer.registerResponse(response.requestId, response.header, callback);
	});

	socket.on('file-segment', function(response){
	  console.log('file-segment');
		fileBuffer.onData(response.bufferId, response.data);
	});

	socket.on('file-end', function(response){
	  console.log('file-end');
		fileBuffer.onFinish(response.bufferId);
	});

	socket.on('segment-chunk', function(response){
		console.log('segment-chunk');
		playerController.bufferSegment(response);
	});
}
