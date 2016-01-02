var io = require('socket.io-client');

var serverUrl = "http://localhost:8080";
var socket		= io.connect(serverUrl, {'force new connection': true});

var clientStream = null;

function ClientSocket() {};

ClientSocket.prototype.initialize = function(stream) {
	clientStream = stream;
};

ClientSocket.sendRequest = function(event, request) {
	console.log({event, request});
	socket.emit(event, request);
};

module.exports = ClientSocket;

//Socket On
socket.on('state', function (data , callback) {
	console.log(data.id + " recived: " + data.command);
	callback({"id" : data.id, "command" : data.command});
});

socket.on('all-smtp', function (data){
	console.log(data);
});

socket.on('video-ready', function(data){
  console.log('video-ready');
  socket.emit('video-stream', "");
});

socket.on('video-metadata', function(data){
  console.log('video-metadata');
	console.log(data);
	clientStream.bufferMetadata(data);
});

socket.on('video-segment', function(data){
  console.log('video-segment');
	console.log(data);
	clientStream.bufferSegment(data);
});

socket.on('file-segment', function(data){
  console.log('file-segment');
	clientStream.bufferFile(data);
});

socket.on('load_file', function(){
  console.log('load_file');
	clientStream.loadMpd();
});
