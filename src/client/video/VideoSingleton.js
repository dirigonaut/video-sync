const util          = require('util');
const EventEmitter  = require('events');

var log             = require('loglevel');
var ClientSocket    = require('../socket/ClientSocket.js');
var MpdMeta        = require('./meta/MpdMeta.js');
var RequestFactory  = require('../utils/RequestFactory.js');
var SourceBuffer    = require('./SourceBuffer.js');

var self = null;
var clientSocket = new ClientSocket();

function VideoSingleton(video) {
  log.setDefaultLevel(0);
  log.info('VideoSingleton');
  this.videoElement     = video;

  this.videoMetas       = null;
  this.selectedMeta     = "webm";

  self = this;
}

util.inherits(VideoSingleton, EventEmitter);

VideoSingleton.prototype.initialize = function(fileBuffer) {
  log.info('VideoSingleton.initialize');
  self.videoElement.addEventListener('play', onPlay, false);
  self.videoMetas = new Map();

  clientSocket.sendRequest('get-meta-files', fileBuffer.registerRequest(self.addMetaData));
};

VideoSingleton.prototype.reset = function(fileBuffer) {
  log.info('VideoSingleton.reset');
  self.videoElement.removeEventListener('play', onPlay, false);
};

VideoSingleton.prototype.getVideoElement = function() {
  return self.videoElement;
};

VideoSingleton.prototype.addMetaData = function(header, binaryFile) {
  log.info('VideoSingleton.addMetaData');
  var util = null;

  if(header.type === 'webm') {
    util = new WebmParser();
  } else if(header.type === 'mp4') {
    util = new Mp4Parser();
  }

  self.videoMetas.set(header.type, new MpdMeta(binaryFile.toString(), util));
  self.emit('metadata-loaded');
};

VideoSingleton.prototype.getActiveMetaData = function() {
  return self.videoMetas.get(self.selectedMeta);
};

VideoSingleton.prototype.setActiveMetaData = function(metaKey) {
  self.selectedMeta = metaKey;
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
    selectedMedia.updateActiveMeta(typeId, selectedMedia.getSegmentIndex(typeId, self.videoElement.currentTime));

    self.emit("get-segment", typeId, self.videoElement.currentTime * 1000);
  };

  return seek;
};

module.exports = VideoSingleton;

function onPlay() {
  console.log("VideoSingleton.onPlay");
  console.log(self);
  self.emit("get-init");
  self.videoElement.removeEventListener('play', onPlay, false);
}
