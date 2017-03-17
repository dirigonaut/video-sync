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
  this.onPlay       = false;
  self              = this;
}

util.inherits(VideoSingleton, EventEmitter);

VideoSingleton.prototype.getVideoElement = function() {
  return self.videoElement;
};

VideoSingleton.prototype.onProgress = function(typeId) {
  var progress = function() {
    if(!self.videoElement.paused) {
      if(self.meta.isLastSegment(typeId, self.videoElement.currentTime)){
        var timeToRequest = self.meta.isReadyForNextSegment(typeId, self.videoElement.currentTime);
        if(timeToRequest !== null){
          log.silly(`VideoSingleton.onProgress - time: ${timeToRequest}`);
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

VideoSingleton.prototype.play = function() {
  var video = this.videoElement;
  if (video.readyState === 4) {
    log.debug("Set video to play");
    video.play();
  } else {
    if(self.onPlay !== true) {
      onPlay();
    }
    video.addEventListener('canplay', resume, {"once": true});
  }
};

VideoSingleton.prototype.pause = function() {
  var video = this.videoElement;
  self.videoElement.removeEventListener('canplay', resume, {"once": true});
  video.pause();
};

module.exports = VideoSingleton;

function onPlay() {
  log.info("VideoSingleton.onPlay");
  self.onPlay = true;
  self.emit("get-init");
  self.videoElement.removeEventListener('play', onPlay, false);
}

function resume() {
  var video = self.videoElement;
  log.debug("Set video to play");
  video.play();
}
