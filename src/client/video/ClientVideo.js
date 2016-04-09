const util          = require('util');
const EventEmitter  = require('events');

var log             = require('loglevel');
var ClientSocket    = require('../socket/ClientSocket.js');
var WebmMeta        = require('./WebmMeta.js');
var RequestFactory  = require('../socket/ClientRequestFactory.js');
var SourceBuffer    = require('./SourceBuffer.js');

var self = null;

function ClientVideo(video, mediaSource, window) {
  log.setDefaultLevel(0);
  if(self == null) {
    log.info('ClientVideo');
    this.mediaSource      = mediaSource;

    this.window           = window;

    this.videoElement     = video;
    this.videoElement.src = this.window.URL.createObjectURL(this.mediaSource);

    this.videoMetas       = null;
    this.selectedMeta     = "webm";

    self = this;
  }
}

util.inherits(ClientVideo, EventEmitter);

ClientVideo.prototype.initialize = function(fileBuffer) {
  log.info('ClientVideo.initialize');
  self.videoElement.addEventListener('play', onPlay, false);
  self.videoMetas = new Map();

  ClientSocket.sendRequest('get-meta-files', fileBuffer.registerRequest(self.addMetaData));
};

ClientVideo.prototype.addMediaSourceEvent = function(event, callback) {
  self.mediaSource.addEventListener(event, callback, false);
};

ClientVideo.prototype.addVideoEvent = function(event, callback) {
  log.info('ClientVideo.addOnProgress');
  self.videoElement.addEventListener(event, callback, false);
  //self.videoElement.addEventListener('waiting', onSeek, false);
};

ClientVideo.prototype.getVideoElement = function() {
  return self.videoElement;
};

ClientVideo.prototype.getMediaSource = function() {
  return self.mediaSource;
};

ClientVideo.prototype.addMetaData = function(header, binaryFile) {
  log.info('ClientVideo.addMetaData');
  if(header.type == "webm") {
    self.videoMetas.set(header.type, new WebmMeta(JSON.parse(binaryFile.toString())));
  }
};

ClientVideo.prototype.getActiveMetaData = function() {
  return self.videoMetas.get(self.selectedMeta);
};

ClientVideo.prototype.setActiveMetaData = function(metaKey) {
  self.selectedMeta = metaKey;
};

ClientVideo.prototype.onProgress = function(typeId) {
  var progress = function() {
    if(!self.videoElement.paused) {
      if(self.videoMetas.get(self.selectedMeta).isLastSegment(typeId)){
        if(self.videoMetas.get(self.selectedMeta).isReadyForNextSegment(typeId, self.videoElement.currentTime)){
          self.emit("get-next", typeId);
        }
      } else {
        console.log("ClientVideo.onProgress - end of segments");
        self.videoElement.removeEventListener('timeupdate', progress, false);
      }
    }
  };

  return progress;
};

ClientVideo.prototype.onSeek = function(typeId) {
  var seek = function() {
    self.emit("get-segment", typeId, self.videoElement.currentTime * 1000);
  };

  return seek;
};

module.exports = ClientVideo;

function onPlay() {
  console.log("ClientVideo.onPlay");
  self.emit("get-init");
  self.videoElement.removeEventListener('play', onPlay, false);
}
