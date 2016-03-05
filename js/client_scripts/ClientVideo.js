const EventEmitter  = require('events');
var log             = require('loglevel');

var ClientSocket    = require('../client_scripts/ClientSocket.js');
var RequestFactory  = require('../client_scripts/ClientRequestFactory.js');

const emitter = new EventEmitter();

var self;

function ClientVideo(video) {
  log.info('ClientVideo');
  this.videoElement  = video;

  this.webmMpdPath   = null;
  this.webmJson      = null;

  this.selectedType  = 'webm';
  this.selectedVideo = null;
  this.audioPath     = null;
  this.baseDir       = null;
  this.step          = 6;

  this.requestSegment = null;
  this.currentIndex = 0;

  self = this;
}

ClientVideo.prototype.initialize = function(basePath) {
  log.info('ClientVideo.initialize');
  this.baseDir = basePath;
  this.videoElement.addEventListener('play', onPlay, false);

  ClientSocket.sendRequest('video-types',
    RequestFactory.buildVideoMetaDataRequest(basePath, null));
};

ClientVideo.prototype.addMetaLoadedEvent = function(callback) {
  log.info('ClientVideo.addMetaLoadedEvent');
  emitter.once('meta-loaded', callback);
};

ClientVideo.prototype.addSegmentRequestCallback = function(callback) {
  log.info('ClientVideo.addSegmentRequestCallback');
  this.requestSegment = callback;
};

ClientVideo.prototype.addOnProgress = function() {
  log.info('ClientVideo.addOnProgress');
  this.videoElement.addEventListener('timeupdate', onProgress, false);
};

ClientVideo.prototype.getVideoElement = function() {
  return this.videoElement;
};

ClientVideo.prototype.setMetaData = function(webmJson) {
  log.info('ClientVideo.setMetaData');
  this.webmJson = JSON.parse(webmJson);
  this.selectedVideo = this.webmJson[0];

  emitter.emit('meta-loaded');
  this.videoElement.addEventListener('onTimeUpdate', onProgress, false);
};

ClientVideo.prototype.setVideoTypes = function(response) {
  log.info('ClientVideo.setVideoTypes');
  for(var i in response) {
    if(response[i].type == "webm") {
      this.webmMpdPath = response[i].path;
    }
  }
};

ClientVideo.prototype.addPath = function(segRange) {
  log.info('ClientVideo.addPath');
  return [self.selectedVideo.path, segRange];
};

ClientVideo.prototype.getInitSegment = function() {
  log.info('ClientVideo.getInitSegment');
  var segRange = null;

  if(this.selectedType == 'webm') {
    segRange = this.webmJson[0].init;
  }

  return this.addPath(segRange);
};

ClientVideo.prototype.getSegment = function(timestamp, setBuf) {
  log.info('ClientVideo.getSegment');
  var segRange = null;

  if(this.selectedType == 'webm') {
    segRange = this._getWebmSegment(timestamp, setBuf);
  }

  return this.addPath(segRange);
};

ClientVideo.prototype.getNextSegment = function(setBuf) {
  log.info('ClientVideo.getNextSegment');
  var segRange = null;
  var curTime = this.videoElement.currentTime;

  if(this.selectedType == 'webm') {
    segRange = this._getWebmSegment(this.webmJson[0].clusters[parseInt(this.currentIndex) + 1].time/1000, setBuf);
  }

  return this.addPath(segRange);
};

ClientVideo.prototype._getWebmSegment = function(timestamp, setBuf) {
  log.info('ClientVideo._getWebmSegment');
  var clusters = this.webmJson[0].clusters;
  var cluster = null;

  for(var i in clusters) {
    if(clusters[i].time == timestamp * 1000) {
      clusters[i].buffered = setBuf;
      cluster = [clusters[i].start, clusters[i].end - 1];
      this.currentIndex = i;
      break;
    } else if(clusters[i].time > timestamp * 1000) {
      clusters[i - 1].buffered = setBuf;
      cluster = [clusters[i-1].start, clusters[i-1].end - 1];
      this.currentIndex = i - 1;
      break;
    }
  }

  return cluster;
};

module.exports = ClientVideo;

function onPlay() {
  console.log("ClientVideo.onPlay");
  ClientSocket.sendRequest('get-file',
    RequestFactory.buildVideoMetaDataRequest(self.webmMpdPath));

    self.videoElement.removeEventListener('play', onPlay, false);
}

function onProgress() {
  if(self.currentIndex < self.selectedVideo.clusters.length - 1){
    var nextCluster = self.selectedVideo.clusters[Math.floor(parseInt(self.currentIndex) + 1)];
    if((nextCluster.time - (self.step/2 * 1000) < self.videoElement.currentTime * 1000) && nextCluster.buffered == undefined){
      console.log("ClientVideo.onProgress - requesting next segment");
      self.requestSegment();
    }
  } else {
    self.videoElement.removeEventListener('play', onProgress, false);
  }
}
