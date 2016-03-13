var io = require('socket.io-client');

var FileBuffer = require('../video/FileBuffer');

var serverUrl = "http://localhost:8080";
var socket		= io.connect(serverUrl, {'force new connection': true});

var clientVideoBuffer = null;
var clientVideo = null;

function ClientSocket() {}

ClientSocket.prototype.initialize = function(videoBuffer, video) {
	clientVideoBuffer = videoBuffer;
	clientVideo = video;
};

ClientSocket.sendRequest = function(event, request) {
	console.log({event, request});
	socket.emit(event, request);
};

module.exports = ClientSocket;

//Socket On
socket.on('state', function (response , callback) {
	console.log(response.id + " recived: " + response.command);
	callback({"id" : response.id, "command" : response.command});
});

socket.on('all-smtp', function (response){
	console.log(response);
});

socket.on('video-ready', function(response){
  console.log('video-ready');
  socket.emit('video-stream', "");
});

socket.on('video-webm', function(response){
  console.log('video-webm');
	clientVideo.setMetaresponse(response);
});

socket.on('video-types', function(response){
  console.log('video-types');
	clientVideo.setVideoTypes(response);
});

socket.on('video-segment', function(response){
	clientVideoBuffer.bufferSegment(response);
});

socket.on('segment-end', function(response){
  console.log('ClientSocket on segment-end');
	clientVideoBuffer.closeStream();
});

socket.on('file-register-response', function(response, callback){
  console.log('file-register-response');
	var fileBuffer = new FileBuffer();
	fileBuffer.registerResponse(response.requestId, response.header, callback);
});

socket.on('file-segment', function(response){
  console.log('file-segment');
	var fileBuffer = new FileBuffer();
	fileBuffer.onData(response.bufferId, response.data);
});

socket.on('file-end', function(response){
  console.log('file-end');
	var fileBuffer = new FileBuffer();
	fileBuffer.onFinish(response.bufferId);
});
