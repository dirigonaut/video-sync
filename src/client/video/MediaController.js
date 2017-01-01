const util          = require('util');
const EventEmitter  = require('events');

var MetaManager     = require('./MetaManager.js');
var SourceBuffer    = require('./SourceBuffer.js');
var VideoSingleton  = require('./VideoSingleton.js');
var ClientSocket    = require('../socket/ClientSocket.js');
var RequestFactory  = require('../utils/RequestFactory.js');

var clientSocket    = new ClientSocket();

var videoElement    = null;
var mediaSource     = null;
var fileBuffer      = null;
var _this           = null;

function MediaController(video, fBuffer) {
  console.log("MediaController");
  this.metaManager = new MetaManager();
  this.metaManager.initialize();

  fileBuffer = fBuffer;
  videoElement = video;

  _this = this;

  this.metaManager.on('meta-data-loaded', function() {
    _this.emit('meta-data-loaded', _this.metaManager.getTrackInfo());
  });
}

util.inherits(MediaController, EventEmitter);

MediaController.prototype.initialize = function(newMediaSource, window) {
  console.log("MediaController.initialize");

  var buildVideoPlayer = function() {
    var videoSingleton = new VideoSingleton(videoElement, _this.metaManager.getActiveMetaData());
    videoSingleton.initialize();

    var sourceBuffers = new Array(2);
    sourceBuffers[SourceBuffer.Enum.VIDEO] = initializeBuffer(SourceBuffer.Enum.VIDEO,
      videoSingleton, mediaSource, _this.metaManager);
    sourceBuffers[SourceBuffer.Enum.AUDIO] = initializeBuffer(SourceBuffer.Enum.AUDIO,
      videoSingleton, mediaSource, _this.metaManager);

    initializeVideo(videoSingleton, mediaSource);

    removeSocketEvents();
    setSocketEvents(videoSingleton, sourceBuffers, new RequestFactory());

    var resetMediaSource = function() {
      console.log("MediaSource Reset");
      videoSingleton.reset();
      delete videoSingleton._events;

      mediaSource.removeEventListener('sourceend', resetMediaSource);
      _this.metaManager.removeAllListeners('meta-data-activated');

      _this.emit('readyToInitialize');
    };

    mediaSource.addEventListener('sourceended', resetMediaSource);
    videoElement.src = window.URL.createObjectURL(newMediaSource);
    videoElement.load();
  };

  var initializeMetaData = function() {
    mediaSource = newMediaSource;
    _this.metaManager.on('meta-data-activated', buildVideoPlayer);
    _this.metaManager.requestMetaData(fileBuffer);
  };

  if(mediaSource !== undefined && mediaSource !== null) {
    _this.once('readyToInitialize', initializeMetaData);
    mediaSource.endOfStream();
  } else {
    initializeMetaData();
  }
};

MediaController.prototype.getTrackInfo = function() {
  return this.metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  this.metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  console.log('MediaController.setForceBuffer')
  var activeMeta = this.metaManager.getActiveMetaData();

  activeMeta.setForceBuffer(SourceBuffer.Enum.VIDEO, forceBuffer);
  activeMeta.setForceBuffer(SourceBuffer.Enum.AUDIO, forceBuffer);
};

MediaController.prototype.setActiveMetaData = function(key, videoIndex, audioIndex, subtitleIndex) {
  var metaInfo = this.metaManager.buildMetaInfo(key, videoIndex, audioIndex, subtitleIndex);
  this.metaManager.setActiveMetaData(metaInfo);
};

module.exports = MediaController;

var initializeBuffer = function(typeId, videoSingleton, mediaSource, metaManager) {
  var sourceBuffer = new SourceBuffer(typeId, videoSingleton, metaManager, mediaSource);
  var codec = metaManager.getActiveMetaData().getMimeType(typeId);

  var bufferEvents = sourceBuffer.setSourceBufferCallback(codec);
  mediaSource.addEventListener('sourceopen', bufferEvents, false);

  var resetBuffer = function() {
    console.log(`Buffer of type: ${typeId} reset.`);
    mediaSource.removeSourceBuffer(sourceBuffer.sourceBuffer);
    mediaSource.removeEventListener('sourceopen', bufferEvents);
    mediaSource.removeEventListener('sourceend', resetBuffer);
  };

  mediaSource.addEventListener('sourceended', resetBuffer);

  return sourceBuffer;
};

var initializeVideo = function(videoSingleton, mediaSource) {
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

  var resetVideo = function() {
    console.log(`Video reset.`);
    videoElement.removeEventListener('timeupdate', onTimeUpdateState, false);
    videoElement.removeEventListener('timeupdate', videoUpdate, false);
    videoElement.removeEventListener('timeupdate', audioUpdate, false);
    videoElement.removeEventListener('seeking', videoSeek, false);
    videoElement.removeEventListener('seeking', audioSeek, false);

    mediaSource.removeEventListener('sourceend', resetVideo);
  };

  mediaSource.addEventListener('sourceended', resetVideo);
};

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

  clientSocket.setEvent('media-ready', function() {
    console.log('media-ready');
    _this.metaManager.requestMetaData(fileBuffer);
  });
}

var removeSocketEvents = function () {
  clientSocket.clearEvent('state-play');
  clientSocket.clearEvent('state-pause');
  clientSocket.clearEvent('state-seek');
  clientSocket.clearEvent('segment-chunk');
}
