const util          = require('util');
const EventEmitter  = require('events');

var SourceBuffer    = require('./SourceBuffer.js');
var VideoSingleton  = require('./VideoSingleton.js');
var ClientSocket    = require('../socket/ClientSocket.js');
var RequestFactory  = require('../utils/RequestFactory.js');

var clientSocket = new ClientSocket();

var videoElement  = null;
var fileBuffer    = null;

function MediaController(video, fBuffer) {
  console.log("MediaController");
  fileBuffer = fBuffer;
  videoElement = video;

  this.on('initialized', function(mediaSource, window) {
    console.log("Attach MediaSource to the videoElement.")
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();
  });
}

util.inherits(MediaController, EventEmitter);

MediaController.prototype.initializeVideo = function(mediaSource, window) {
  console.log("MediaController.initializeVideo");
  var videoSingleton = new VideoSingleton(videoElement);
  videoSingleton.initialize(fileBuffer);

  var sourceBuffers = new Array(2);
  sourceBuffers[SourceBuffer.Enum.VIDEO] = new SourceBuffer(SourceBuffer.Enum.VIDEO, videoSingleton, mediaSource);
  sourceBuffers[SourceBuffer.Enum.AUDIO] = new SourceBuffer(SourceBuffer.Enum.AUDIO, videoSingleton, mediaSource);

  mediaSource.addEventListener('sourceopen',
    sourceBuffers[SourceBuffer.Enum.VIDEO].setSourceBufferCallback('video/webm; codecs="vp9"'), false);
  mediaSource.addEventListener('sourceopen',
    sourceBuffers[SourceBuffer.Enum.AUDIO].setSourceBufferCallback('audio/webm; codecs="vorbis"'), false);

  var onTimeUpdateState = function() {
    clientSocket.sendRequest('state-time-update', new RequestFactory().buildVideoStateRequest(videoElement), false);
  };

  videoElement.addEventListener('timeupdate', onTimeUpdateState, false);

  var videoUpdate = videoSingleton.onProgress(SourceBuffer.Enum.VIDEO);
  var audioUpdate = videoSingleton.onProgress(SourceBuffer.Enum.AUDIO);
  videoElement.addEventListener('timeupdate', videoUpdate, false);
  videoElement.addEventListener('timeupdate', audioUpdate, false);

  var videoSeek = videoSingleton.onSeek(SourceBuffer.Enum.VIDEO);
  var audioSeek = videoSingleton.onSeek(SourceBuffer.Enum.AUDIO);
  videoElement.addEventListener('seeking', videoSeek, false);
  videoElement.addEventListener('seeking', audioSeek, false);

  removeSocketEvents();
  setSocketEvents(videoSingleton, sourceBuffers, new RequestFactory());

  var self = this;

  var reset = function() {
    console.log("MediaController Reset");
    videoElement.removeEventListener('timeupdate', onTimeUpdateState, false);
    videoElement.removeEventListener('timeupdate', videoUpdate, false);
    videoElement.removeEventListener('timeupdate', audioUpdate, false);
    videoElement.removeEventListener('seeking', videoSeek, false);
    videoElement.removeEventListener('seeking', audioSeek, false);

    mediaSource.removeSourceBuffer(sourceBuffers[SourceBuffer.Enum.VIDEO].sourceBuffer);
    mediaSource.removeSourceBuffer(sourceBuffers[SourceBuffer.Enum.AUDIO].sourceBuffer);
    mediaSource.removeEventListener('sourceend', reset);

    console.log(videoSingleton);
    videoSingleton.reset();
    delete videoSingleton._events;
    self.emit('readyToInitialize');
  };

  mediaSource.addEventListener('sourceended', reset);

  this.emit('initialized', mediaSource, window);
};

module.exports = MediaController;

var setSocketEvents = function(videoSingleton, sourceBuffers, requestFactory) {
  clientSocket.setEvent('state-play', function(callback) {
    console.log("state-play");
    var video = videoSingleton.getVideoElement();
    video.play();
    callback(clientSocket.getSocketId(), video.currentTime, video.paused);
  });

  clientSocket.setEvent('state-pause', function(callback) {
    console.log("state-pause");
    var video = videoSingleton.getVideoElement();
    video.pause();
    console.log(video.currentTime);
    callback(clientSocket.getSocketId(), video.currentTime, video.paused);
    clientSocket.sendRequest('state-sync');
  });

  clientSocket.setEvent('state-seek', function(data, callback) {
    console.log("state-seek");
    var video = videoSingleton.getVideoElement();
    video.pause();
    video.currentTime = data.seektime;
    console.log(data);
    callback(clientSocket.getSocketId(), video.currentTime, video.paused);
  });

  clientSocket.setEvent('segment-chunk', function(segment){
    console.log('segment-chunk');
    sourceBuffers[segment.typeId].bufferSegment(segment.data, videoSingleton);
  });
}

var removeSocketEvents = function () {
  clientSocket.clearEvent('state-play');
  clientSocket.clearEvent('state-pause');
  clientSocket.clearEvent('state-seek');
  clientSocket.clearEvent('segment-chunk');
}
