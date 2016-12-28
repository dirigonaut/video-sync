const util          = require('util');
const EventEmitter  = require('events');

var log             = require('loglevel');
var ClientSocket    = require('../socket/ClientSocket.js');

var self = null;
var clientSocket = new ClientSocket();

function VideoSingleton(video, meta) {
  log.setDefaultLevel(0);
  log.info('VideoSingleton');
  this.videoElement = video;
  this.meta         = meta;
  self              = this;
}

util.inherits(VideoSingleton, EventEmitter);

VideoSingleton.prototype.initialize = function() {
  log.info('VideoSingleton.initialize');
  self.videoElement.addEventListener('play', onPlay, false);
};

VideoSingleton.prototype.reset = function() {
  log.info('VideoSingleton.reset');
  self.videoElement.removeEventListener('play', onPlay, false);
};

VideoSingleton.prototype.getVideoElement = function() {
  return self.videoElement;
};

VideoSingleton.prototype.onProgress = function(typeId) {
  var progress = function() {
    if(!self.videoElement.paused) {
      if(self.meta.isLastSegment(typeId, self.videoElement.currentTime)){
        var timeToRequest = self.meta.isReadyForNextSegment(typeId, self.videoElement.currentTime);
        if(timeToRequest !== null){
          console.log(`VideoSingleton.onProgress - time: ${timeToRequest}`);
          self.emit("get-segment", typeId, timeToRequest);
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
    self.meta.updateActiveMeta(typeId, self.meta.getSegmentIndex(typeId, self.videoElement.currentTime));
    self.emit("get-segment", typeId, self.videoElement.currentTime);
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
