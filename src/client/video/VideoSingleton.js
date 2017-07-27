const Util   = require('util');
const Events = require('events');

var videoElement, sourceEvents, metaData, socket, schemaFactory, log;

function Video() { }

Video.prototype.initialize = function(force) {
};

Video.prototype.setup = function() {
  var onTimeUpdateState = function() {
    socket.request('state-time-update', new RequestFactory().buildVideoStateRequest(videoElement));
  };

  sourceEvents = [];

  videoElement.currentTime = 0;
  videoElement.addEventListener('timeupdate', onTimeUpdateState, false);
  var activeMeta = metaManager.getActiveMetaData();

  if(activeMeta.active.get(SourceBuffer.Enum.VIDEO)) {
    sourceEvents[SourceBuffer.Enum.VIDEO] = createVideoEvents(this, SourceBuffer.Enum.VIDEO);
  }

  if(activeMeta.active.get(SourceBuffer.Enum.AUDIO)) {
    sourceEvents[SourceBuffer.Enum.AUDIO] = createVideoEvents(this, SourceBuffer.Enum.AUDIO);
  }

  this.emit('get-init');
};

Video.prototype.getVideoElement = function() {
  return videoElement;
};

Video.prototype.setVideoElement = function(video) {
  videoElement = video;
};

Video.prototype.onReset = function() {
  return reset = function() {
    log.info(`Video reset.`);
    videoElement.removeEventListener('timeupdate', onTimeUpdateState, false);

    if(sourceEvents[SourceBuffer.Enum.VIDEO].length > 0) {
      removeVideoSourceEvents(SourceBuffer.Enum.VIDEO);
    }

    if(sourceEvents[SourceBuffer.Enum.AUDIO].length > 0) {
      removeVideoSourceEvents(SourceBuffer.Enum.AUDIO);
    }
  };
}

Video.prototype.onProgress = function(typeId) {
  var progress = function() {
    if(self.initialized) {
      if(meta.isLastSegment(typeId, videoElement.currentTime)){
        var timeToRequest = meta.isReadyForNextSegment(typeId, videoElement.currentTime);
        if(timeToRequest && timeToRequest === timeToRequest){
          log.debug(`Video.onProgress - time: ${timeToRequest} current: ${videoElement.currentTime}`);
          this.emit("get-segment", typeId, timeToRequest);
        }
      } else {
        log.debug("Video.onProgress - end of segments");
        videoElement.removeEventListener('timeupdate', progress, false);
      }
    }
  }.bind(this);

  return progress;
};

Video.prototype.onSeek = function(typeId) {
  return seek = function() {
    meta.updateActiveMeta(typeId, meta.getSegmentIndex(typeId, videoElement.currentTime));
    this.emit("seek-segment", typeId, videoElement.currentTime);
  }.bind(this);
};

Video.prototype.play = function() {
  var video = videoElement;

  if(video.readyState === 4) {
    log.debug("Set video to play");
    video.play();
  } else {
    log.debug("Set video to play when canplay");
    video.addEventListener('canplay', resume, {"once": true});
  }
};

Video.prototype.pause = function() {
  var video = this.videoElement;
  self.videoElement.removeEventListener('canplay', resume, {"once": true});
  video.pause();
};

module.exports = Video;

function resume() {
  var video = videoElement;
  log.debug("Set video to play");
  video.play();
}

var setVideoSourceEvents = function(typeEnum) {
  log.info(`Creating video events for buffer of type: ${typeEnum}.`);
  var bufferEvents = [];

  var bufferUpdate = this.onProgress(typeEnum);
  videoElement.addEventListener('timeupdate', bufferUpdate, false);
  bufferEvents.push(bufferUpdate);

  var bufferSeek = this.onSeek(typeEnum);
  videoElement.addEventListener('seeking', bufferSeek, false);
  bufferEvents.push(bufferSeek);

  return bufferEvents;
}

var removeVideoSourceEvents = function(typeEnum) {
  log.info(`Removing video events for buffer of type: ${typeEnum}.`);
  videoElement.removeEventListener('timeupdate', sourceEvents[typeEnum][0], false);
  videoElement.removeEventListener('seeking', sourceEvents[typeEnum][1], false);
}
