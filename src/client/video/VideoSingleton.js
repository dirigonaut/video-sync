const util          = require('util');
const EventEmitter  = require('events');

var log             = require('loglevel');
var ClientSocket    = require('../socket/ClientSocket.js');
var WebmMeta        = require('./WebmMeta.js');
var RequestFactory  = require('../utils/RequestFactory.js');
var SourceBuffer    = require('./SourceBuffer.js');

var self = null;

function VideoSingleton(video, mediaSource, window) {
  log.setDefaultLevel(0);
  if(self == null) {
    log.info('VideoSingleton');
    video.src = window.URL.createObjectURL(mediaSource);

    this.mediaSource      = mediaSource;
    this.window           = window;
    this.videoElement     = video;

    this.videoMetas       = null;
    this.selectedMeta     = "webm";

    self = this;
  }
}

util.inherits(VideoSingleton, EventEmitter);

VideoSingleton.prototype.initialize = function(fileBuffer) {
  log.info('VideoSingleton.initialize');
  self.videoElement.addEventListener('play', onPlay, false);
  self.videoMetas = new Map();

  new ClientSocket().sendRequest('get-meta-files', fileBuffer.registerRequest(self.addMetaData));
};

VideoSingleton.prototype.addMediaSourceEvent = function(event, callback) {
  self.mediaSource.addEventListener(event, callback, false);
};

VideoSingleton.prototype.addVideoEvent = function(event, callback) {
  log.info('VideoSingleton.addOnProgress');
  self.videoElement.addEventListener(event, callback, false);
  //self.videoElement.addEventListener('waiting', onSeek, false);
};

VideoSingleton.prototype.getVideoElement = function() {
  return self.videoElement;
};

VideoSingleton.prototype.getMediaSource = function() {
  return self.mediaSource;
};

VideoSingleton.prototype.addMetaData = function(header, binaryFile) {
  log.info('VideoSingleton.addMetaData');
  if(header.type == "webm") {
    self.videoMetas.set(header.type, new WebmMeta(JSON.parse(binaryFile.toString())));
  }
};

VideoSingleton.prototype.getActiveMetaData = function() {
  return self.videoMetas.get(self.selectedMeta);
};

VideoSingleton.prototype.setActiveMetaData = function(metaKey) {
  self.selectedMeta = metaKey;
};

VideoSingleton.prototype.play = function() {
  self.videoElement.play();
};

VideoSingleton.prototype.pause = function() {
  self.videoElement.pause();
};

VideoSingleton.prototype.mute = function(muted) {
  self.videoElement.muted = muted;
};

VideoSingleton.prototype.onProgress = function(typeId) {
  var progress = function() {
    var selectedMedia = self.videoMetas.get(self.selectedMeta);
    if(!self.videoElement.paused) {
      if(selectedMedia.isLastSegment(typeId)){
        if(selectedMedia.isReadyForNextSegment(typeId, self.videoElement.currentTime)){
          console.log("VideoSingleton.onProgress - isReady");
          self.emit("get-next", typeId, (self.videoElement.currentTime * 1000) + selectedMedia.getActiveMeta(typeId).timeStep);
        }
      } else {
        console.log("VideoSingleton.onProgress - end of segments");
        self.videoElement.removeEventListener('timeupdate', progress, false);
      }
    }
  };

  return progress;
};

VideoSingleton.prototype.onSeek = function(typeId) {
  var seek = function() {
    var selectedMedia = self.videoMetas.get(self.selectedMeta);
    selectedMedia.updateActiveMeta(typeId, selectedMedia.getSegmentIndex(typeId, self.videoElement.currentTime * 1000));

    self.videoElement.pause(true);
    self.emit("get-segment", typeId, self.videoElement.currentTime * 1000);
  };

  return seek;
};

VideoSingleton.prototype.onSeeked = function() {
  self.videoElement.pause = false;
};

module.exports = VideoSingleton;

function onPlay() {
  console.log("VideoSingleton.onPlay");
  self.emit("get-init");
  self.videoElement.removeEventListener('play', onPlay, false);
}
