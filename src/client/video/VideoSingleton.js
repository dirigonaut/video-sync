const util          = require('util');
const EventEmitter  = require('events');

var ClientLog       = require('../log/ClientLogManager');
var ClientSocket    = require('../socket/ClientSocket');

var self = null;
var clientSocket = new ClientSocket();
var log = ClientLog.getLog();

function VideoSingleton(video, meta) {
  log.info('VideoSingleton');
  this.videoElement = video;
  this.meta         = meta;
  this.initialized  = false;
  self              = this;
}

util.inherits(VideoSingleton, EventEmitter);

VideoSingleton.prototype.getVideoElement = function() {
  return self.videoElement;
};

VideoSingleton.prototype.onProgress = function(typeId) {
  var progress = function() {
    if(self.initialized) {
      if(self.meta.isLastSegment(typeId, self.videoElement.currentTime)){
        var timeToRequest = self.meta.isReadyForNextSegment(typeId, self.videoElement.currentTime);
        if(timeToRequest !== null){
          log.debug(`VideoSingleton.onProgress - time: ${timeToRequest} current: ${self.videoElement.currentTime}`);
          self.emit("get-segment", typeId, timeToRequest);
        }
      } else {
        log.debug("VideoSingleton.onProgress - end of segments");
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

VideoSingleton.prototype.init = function(callback) {
  log.info("VideoSingleton.init");
  self.initialized = true;
  self.emit("get-init");
  callback(clientSocket.getSocketId());
};

VideoSingleton.prototype.play = function() {
  var video = this.videoElement;

  if(video.readyState === 4) {
    log.debug("Set video to play");
    video.play();
  } else {
    log.debug("Set video to play when canplay");
    video.addEventListener('canplay', resume, {"once": true});
  }
};

VideoSingleton.prototype.pause = function() {
  var video = this.videoElement;
  self.videoElement.removeEventListener('canplay', resume, {"once": true});
  video.pause();
};

module.exports = VideoSingleton;

function resume() {
  var video = self.videoElement;
  log.debug("Set video to play");
  video.play();
}
