const util          = require('util');
const EventEmitter  = require('events');

var log             = require('loglevel');

var ClientSocket    = require('../socket/ClientSocket.js');
var FileBuffer      = require('./FileBuffer.js');
var WebmMeta        = require('./WebmMeta.js');
var RequestFactory  = require('../socket/ClientRequestFactory.js');

var self = null;

function ClientVideo(video) {
  if(self === null) {
    log.info('ClientVideo');
    this.videoElement  = video;
    this.videoMetas    = null;
    this.selectedMeta  = "webm";

    self = this;
  }
}

util.inherits(ClientVideo, EventEmitter);

ClientVideo.prototype.initialize = function() {
  log.info('ClientVideo.initialize');
  self.videoElement.addEventListener('play', onPlay, false);
  self.videoMetas = new Map();

  var fileBuffer = new FileBuffer();
  ClientSocket.sendRequest('get-meta-files', fileBuffer.registerRequest(self.addMetaData));
};

ClientVideo.prototype.addVideoEvents = function() {
  log.info('ClientVideo.addOnProgress');
  self.videoElement.addEventListener('timeupdate', onProgress, false);
  self.videoElement.addEventListener('waiting', onSeek, false);
};

ClientVideo.prototype.getVideoElement = function() {
  return self.videoElement;
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

module.exports = ClientVideo;

function onPlay() {
  console.log("ClientVideo.onPlay");
  self.emit("get-init");
  self.videoElement.removeEventListener('play', onPlay, false);
}

function onProgress() {
  if(self.videoMetas.get(self.selectedMeta).isLastSegment()){
    if(self.videoMetas.get(self.selectedMeta).isReadyForNextSegment(self.videoElement.currentTime)){
      console.log("ClientVideo.onProgress - requesting next segment");
      self.emit("get-next");
    }
  } else {
    self.videoElement.removeEventListener('play', onProgress, false);
  }
}

function onSeek() {
  //TODO make work
  self.emit("get-segment");
}
