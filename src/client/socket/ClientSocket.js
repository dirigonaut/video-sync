var io = require('socket.io-client');

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

socket.on('video-webm', function(data){
  console.log('video-webm');
	clientVideo.setMetaData(data);
});

socket.on('video-types', function(data){
  console.log('video-types');
	clientVideo.setVideoTypes(data);
});

socket.on('video-segment', function(data){
  console.log('ClientSocket on video-segment');
	if(data != null) {console.log(data.length);}
	clientVideoBuffer.bufferSegment(data);
});

socket.on('segment-end', function(data){
  console.log('ClientSocket on segment-end');
	clientVideoBuffer.closeStream();
});

socket.on('file-segment', function(data){
  console.log('file-segment');
	if(data != null) {console.log(data.length);}
	clientVideoBuffer.bufferMetaFile(data);
});

socket.on('file-end', function(){
  console.log('file-end');
	clientVideoBuffer.setMetaData();
});
