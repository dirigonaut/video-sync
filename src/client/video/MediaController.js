const util          = require('util');
const EventEmitter  = require('events');

var MetaManager     = require('./MetaManager.js');
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

  var _this = this;
  this.on('initialized', function(mediaSource, window) {
    console.log("Attach MediaSource to the videoElement.")
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();
    _this.emit("video-ready");
  });
}

util.inherits(MediaController, EventEmitter);

MediaController.prototype.initializeVideo = function(mediaSource, window) {
  console.log("MediaController.initializeVideo");
  var _this = this;

  this.metaManager = new MetaManager();
  this.metaManager.requestMetaData(fileBuffer);
  this.metaManager.on('meta-data-loaded', function() {
    _this.emit('meta-data-loaded', _this.metaManager.getTrackInfo());
  });

  this.metaManager.on('meta-data-activated', function() {
    var videoSingleton = new VideoSingleton(videoElement, _this.metaManager.getActiveMetaData());
    videoSingleton.initialize();

    var sourceBuffers = new Array(2);
    sourceBuffers[SourceBuffer.Enum.VIDEO] = new SourceBuffer(SourceBuffer.Enum.VIDEO,
      videoSingleton, _this.metaManager.getActiveMetaData(), mediaSource);
    sourceBuffers[SourceBuffer.Enum.AUDIO] = new SourceBuffer(SourceBuffer.Enum.AUDIO,
      videoSingleton, _this.metaManager.getActiveMetaData(), mediaSource);

    var videoCodec = _this.metaManager.getActiveMetaData().getMimeType(SourceBuffer.Enum.VIDEO);
    var audioCodec = _this.metaManager.getActiveMetaData().getMimeType(SourceBuffer.Enum.AUDIO);

    console.log(`Video: ${videoCodec}, Audio: ${audioCodec}`);
    mediaSource.addEventListener('sourceopen',
      sourceBuffers[SourceBuffer.Enum.VIDEO].setSourceBufferCallback(videoCodec), false);
    mediaSource.addEventListener('sourceopen',
      sourceBuffers[SourceBuffer.Enum.AUDIO].setSourceBufferCallback(audioCodec), false);

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
      _this.emit('readyToInitialize');
    };

    mediaSource.addEventListener('sourceended', reset);

    _this.emit('meta-data-loaded', _this.metaManager.getTrackInfo());
    _this.emit('initialized', mediaSource, window);
  });
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  this.metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setActiveMetaData = function(metaInfo) {
  this.metaManager.setActiveMetaData(metaInfo);
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
