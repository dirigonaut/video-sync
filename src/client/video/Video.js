const Promise = require('bluebird');
const Events  = require('events');

var videoElement, sourceEvents, metaData, socket, schemaFactory, log;

function Video() { }

Video.prototype.initialize = function(force) {
  if(typeof Video.prototype.protoInit === 'undefined') {
    Video.prototype.protoInit = true;
    Object.setPrototypeOf(Video.prototype, Events.prototype);

    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.LogEnum.VIDEO);

    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();
  }
};

Video.prototype.setup = function(videoElement,window, mediaSource) {
  if(videoElement) {
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();
    videoElement.currentTime = 0;
    videoElement.addEventListener('timeupdate', videoPing, false);

    var eventId = setInterval(function() {
      if(videoElement.play) {
        videoPing();
      }
    }, 1000));

    var metaManager = this.factory.createMetaManager();
    metaData = metaManager.getActiveMetaData();

    sourceEvents = [];
    if(metaData.active.get(SourceBuffer.Enum.VIDEO)) {
      sourceEvents[SourceBuffer.Enum.VIDEO] = setVideoSourceEvents.call(this, SourceBuffer.Enum.VIDEO);
    }

    if(metaData.active.get(SourceBuffer.Enum.AUDIO)) {
      sourceEvents[SourceBuffer.Enum.AUDIO] = setVideoSourceEvents.call(this, SourceBuffer.Enum.AUDIO);
    }

    return new Promise.resolve(onReset(eventId));
  } else {
    throw new Error('Video.setup: videoElement is not defind.')
  }
};

Video.prototype.getVideoElement = function() {
  return videoElement;
};

module.exports = Video;

function play() {
  if(videoElement.readyState === 4) {
    log.debug("Set video to play");
    videoElement.play();
  } else {
    log.debug("Set video to play when canplay");
    videoElement.addEventListener('canplay', videoElement.play, {"once": true});
  }
}

function pause() {
  videoElement.removeEventListener('canplay', videoElement.play, {"once": true});
  videoElement.pause();
}

function setSocketEvents() {
  socket.setEvent('state-play', function() {
    log.debug("state-play");
    play();

    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATE,
      [videoElement.currentTime, videoElement.play, videoElement.canPlay]));

    socket.sendRequest('state-update-state', request, true);
  });

  socket.setEvent('state-pause', function(command) {
    log.debug(`state-pause sync: ${isSynced}`);
    pause();

    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATE,
      [videoElement.currentTime, videoElement.play, videoElement.canPlay]));

    clientSocket.sendRequest('state-update-state', request, true);

    if(command.sync) {
      clientSocket.sendRequest('state-sync');
    }
  });

  socket.setEvent('state-seek', function(command) {
    log.debug("state-seek", data);
    pause();
    videoElement.currentTime = command.time;

    if(command.play) {
      play();
    }

    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATE,
      [videoElement.currentTime, videoElement.play, videoElement.canPlay]));

    if(command.sync){
      socket.request('state-update-sync', request, true);
    } else {
      socket.request('state-update-state', request, true);
    }
  });
}

function removeSocketEvents() {
  socket.removeEvent('state-play');
  socket.removeEvent('state-pause');
  socket.removeEvent('state-seek');
}

function setVideoSourceEvents(typeEnum) {
  log.info(`Creating video events for buffer of type: ${typeEnum}.`);
  var bufferEvents = [];

  var bufferUpdate = onProgress.call(this, typeEnum);
  videoElement.addEventListener('timeupdate', bufferUpdate, false);
  bufferEvents.push(bufferUpdate);

  var bufferSeek = onSeek.call(this, typeEnum);
  videoElement.addEventListener('seeking', bufferSeek, false);
  bufferEvents.push(bufferSeek);

  return bufferEvents;
}

function removeVideoSourceEvents(typeEnum) {
  log.info(`Removing video events for buffer of type: ${typeEnum}.`);
  videoElement.removeEventListener('timeupdate', sourceEvents[typeEnum][0], false);
  videoElement.removeEventListener('seeking', sourceEvents[typeEnum][1], false);
}

function onReset(eventId) {
  return reset = function() {
    log.info(`Video reset.`);
    videoElement.removeEventListener('timeupdate', videoPing, false);
    clearInterval(eventId);

    if(sourceEvents[SourceBuffer.Enum.VIDEO].length > 0) {
      removeVideoSourceEvents(SourceBuffer.Enum.VIDEO);
    }

    if(sourceEvents[SourceBuffer.Enum.AUDIO].length > 0) {
      removeVideoSourceEvents(SourceBuffer.Enum.AUDIO);
    }
  };
}

function onProgress(typeId) {
  return progress = function() {
    if(metaData.isLastSegment(typeId, videoElement.currentTime)){
      var timeToRequest = metaData.isReadyForNextSegment(typeId, videoElement.currentTime);
      if(timeToRequest && timeToRequest === timeToRequest){
        log.debug(`Video.onProgress - time: ${timeToRequest} current: ${videoElement.currentTime}`);
        this.emit("get-segment", typeId, timeToRequest);
      }
    } else {
      log.debug("Video.onProgress - end of segments");
      videoElement.removeEventListener('timeupdate', progress, false);
    }
  }.bind(this);
}

function onSeek(typeId) {
  return seek = function() {
    metaData.updateActiveMeta(typeId, metaData.getSegmentIndex(typeId, videoElement.currentTime));
    this.emit("seek-segment", typeId, videoElement.currentTime);
  }.bind(this);
}

function videoPing() {
  socket.request('video-ping', schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATE,
    [videoElement.currentTime, videoElement.play, videoElement.canPlay]));
}
