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
    video.src = window.URL.createObjectURL(mediaSource);

    this.mediaSource      = mediaSource;
    this.window           = window;
    this.videoElement     = video;

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
    var selectedMedia = self.videoMetas.get(self.selectedMeta);
    if(!self.videoElement.paused) {
      if(selectedMedia.isLastSegment(typeId)){
        if(selectedMedia.isReadyForNextSegment(typeId, self.videoElement.currentTime)){
          console.log("ClientVideo.onProgress - isReady");
          self.emit("get-next", typeId, (self.videoElement.currentTime * 1000) + selectedMedia.getActiveMeta(typeId).timeStep);
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
    var selectedMedia = self.videoMetas.get(self.selectedMeta);
    selectedMedia.updateActiveMeta(typeId, selectedMedia.getSegmentIndex(typeId, self.videoElement.currentTime * 1000));

    self.videoElement.pause(true);
    self.emit("get-segment", typeId, self.videoElement.currentTime * 1000);
  };

  return seek;
};

ClientVideo.prototype.onSeeked = function() {
  self.videoElement.pause = false;
};

module.exports = ClientVideo;

function onPlay() {
  console.log("ClientVideo.onPlay");
  self.emit("get-init");
  self.videoElement.removeEventListener('play', onPlay, false);
}
