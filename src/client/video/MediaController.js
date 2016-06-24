var SourceBuffer    = require('./SourceBuffer.js');
var VideoSingleton  = require('./VideoSingleton.js');
var ClientSocket    = require('../socket/ClientSocket.js');
var RequestFactory  = require('../utils/RequestFactory.js');

var clientSocket = new ClientSocket();

function MediaController(fBuffer) {
  console.log("MediaController");
  this.video;
  this.sourceBuffers;
  this.videoSingleton;

  this.fileBuffer = fBuffer;
}

MediaController.prototype.initializeVideo = function(videoElement, mediaSource, window) {
  console.log("MediaController.initializeVideo");
  videoElement.src    = window.URL.createObjectURL(mediaSource);
  this.videoSingleton = new VideoSingleton(videoElement, mediaSource);

  this.sourceBuffers = new Array(2);
  this.sourceBuffers[SourceBuffer.Enum.VIDEO] = new SourceBuffer(SourceBuffer.Enum.VIDEO, this.videoSingleton);
  this.sourceBuffers[SourceBuffer.Enum.AUDIO] = new SourceBuffer(SourceBuffer.Enum.AUDIO, this.videoSingleton);

  this.videoSingleton.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.VIDEO].setSourceBufferCallback('video/webm; codecs="vp9"'));
  this.videoSingleton.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.AUDIO].setSourceBufferCallback('audio/webm; codecs="vorbis"'));

  this.videoSingleton.initialize(this.fileBuffer);

  this.videoSingleton.addVideoEvent('timeupdate', onTimeUpdateState(videoElement));

  this.videoSingleton.addVideoEvent('timeupdate', this.videoSingleton.onProgress(SourceBuffer.Enum.VIDEO));
  this.videoSingleton.addVideoEvent('timeupdate', this.videoSingleton.onProgress(SourceBuffer.Enum.AUDIO));

  this.videoSingleton.addVideoEvent('seeking', this.videoSingleton.onSeek(SourceBuffer.Enum.VIDEO));
  this.videoSingleton.addVideoEvent('seeking', this.videoSingleton.onSeek(SourceBuffer.Enum.AUDIO));

  setSocketEvents(this.videoSingleton, this.sourceBuffers, new RequestFactory());
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

var onTimeUpdateState = function(videoElement) {
  return function() {
      clientSocket.sendRequest('state-time-update', new RequestFactory().buildVideoStateRequest(videoElement), false);
  }
}
