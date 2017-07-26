const Util   = require('util');
const Events = require('events');

var videoElement, metaData, socket, log;


function VideoSingleton() { }

VideoSingleton.prototype.initialize = function(mediaSource) {
  var onTimeUpdateState = function() {
    clientSocket.sendRequest('state-time-update', new RequestFactory().buildVideoStateRequest(videoElement));
  };

  videoElement.currentTime = 0;
  videoElement.addEventListener('timeupdate', onTimeUpdateState, false);

  var videoEvents = [];
  var audioEvents = [];
  var activeMeta = _this.metaManager.getActiveMetaData();

  if(activeMeta.active.get(SourceBuffer.Enum.VIDEO) !== undefined) {clientSocket
    videoEvents = createVideoEvents(videoSingleton, SourceBuffer.Enum.VIDEO);
  }

  if(activeMeta.active.get(SourceBuffer.Enum.AUDIO) !== undefined) {
    audioEvents = createVideoEvents(videoSingleton, SourceBuffer.Enum.AUDIO);
  }

  var resetVideo = function() {
    log.info(`Video reset.`);
    videoElement.removeEventListener('timeupdate', onTimeUpdateState, false);

    if(videoEvents.length > 0) {
      videoElement.removeEventListener('timeupdate', videoEvents[0], false);
      videoElement.removeEventListener('seeking', videoEvents[1], false);
    }

    if(audioEvents.length > 0) {
      videoElement.removeEventListener('timeupdate', audioEvents[0], false);
      videoElement.removeEventListener('seeking', audioEvents[1], false);
    }

    mediaSource.removeEventListener('sourceended', resetVideo);
  };

  mediaSource.addEventListener('sourceended', resetVideo);
};

VideoSingleton.prototype.getVideoElement = function() {
  return self.videoElement;
};

VideoSingleton.prototype.onProgress = function(typeId) {
  var progress = function() {
    if(self.initialized) {
      if(self.meta.isLastSegment(typeId, self.videoElement.currentTime)){
        var timeToRequest = self.meta.isReadyForNextSegment(typeId, self.videoElement.currentTime);
        if(timeToRequest !== null && timeToRequest === timeToRequest){
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
    self.emit("seek-segment", typeId, self.videoElement.currentTime);
  };

  return seek;
};

VideoSingleton.prototype.setup = function(callback) {
  log.info("VideoSingleton.init");
  self.initialized = true;
  self.emit("get-init");
  callback();
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

var createVideoEvents = function(videoSingleton, typeEnum) {
  log.info(`Creating video events for buffer of type: ${typeEnum}.`);
  var bufferEvents = [];

  var bufferUpdate = videoSingleton.onProgress(typeEnum);
  videoElement.addEventListener('timeupdate', bufferUpdate, false);
  bufferEvents.push(bufferUpdate);

  var bufferSeek = videoSingleton.onSeek(typeEnum);
  videoElement.addEventListener('seeking', bufferSeek, false);
  bufferEvents.push(bufferSeek);

  return bufferEvents;
}
