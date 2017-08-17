const Promise = require('bluebird');
const Events  = require('events');

var videoElement, sourceEvents, metaData, socket, schemaFactory, eventKeys, log;

function Video() { }

Video.prototype.initialize = function(force) {
  if(typeof Video.prototype.protoInit === 'undefined') {
    Video.prototype.protoInit = true;
    Object.setPrototypeOf(Video.prototype, Events.prototype);

    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.LogEnum.VIDEO);

    eventKeys       = this.factory.createKeys();
    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();
  }
};

Video.prototype.setup = function(element, window, mediaSource) {
  log.debug('Video.setup');
  if(element) {
    videoElement = element;
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();
    videoElement.currentTime = 0;
    videoElement.addEventListener('timeupdate', videoPing, false);
    videoElement.onerror = function() { console.log(videoElement.error) };

    var eventId = setInterval(function() {
      if(videoElement.play) {
        videoPing();
      }
    }, 1000);

    var metaManager = this.factory.createMetaManager();
    metaData = metaManager.getActiveMetaData();
    sourceEvents = [];

    if(metaData && metaData.activeMeta) {
      if(metaData.activeMeta.get(metaManager.Enum.VIDEO)) {
        sourceEvents[metaManager.Enum.VIDEO] = setVideoSourceEvents.call(this, metaManager.Enum.VIDEO);
      }

      if(metaData.activeMeta.get(metaManager.Enum.AUDIO)) {
        sourceEvents[metaManager.Enum.AUDIO] = setVideoSourceEvents.call(this, metaManager.Enum.AUDIO);
      }
    } else {
      throw new Error('Video.setup: metaData.activeMeta is not defined.');
    }

    setSocketEvents();

    return new Promise.resolve(onReset(eventId, metaManager));
  } else {
    throw new Error('Video.setup: element is not defined.');
  }
};

Video.prototype.getVideoElement = function() {
  return videoElement;
};

module.exports = Video;

function play() {
  log.debug('Video.play');
  if(videoElement.readyState === 4) {
    log.debug("Set video to play");
    videoElement.play();
  } else {
    log.debug("Set video to play when canplay");
    videoElement.addEventListener('canplay', videoElement.play, {"once": true});
  }
}

function pause() {
  log.debug('Video.pause');
  videoElement.pause();
  videoElement.removeEventListener('canplay', videoElement.play, {"once": true});
}

function setSocketEvents() {
  log.debug('Video.setSocketEvents');

  socket.setEvent(eventKeys.PLAY, function(command) {
    log.debug(eventKeys.PLAY, command);
    play();
    videoPing();
  });

  socket.setEvent(eventKeys.PAUSE, function(command) {
    log.debug(eventKeys.PAUSE, command);
    pause();
    videoPing();
    socket.request(eventKeys.SYNC);
  });

  socket.setEvent(eventKeys.SEEK, function(command) {
    log.debug(eventKeys.SEEK, command);
    if(!command.play) {
      pause();
    } else {
      play();
    }

    videoElement.currentTime = command.time;
    videoPing();
  });
}

function removeSocketEvents() {
  log.debug('Video.removeSocketEvents');
  socket.removeEvent(eventKeys.PLAY);
  socket.removeEvent(eventKeys.PAUSE);
  socket.removeEvent(eventKeys.SEEK);
}

function setVideoSourceEvents(bufferType) {
  log.info(`Creating video events for buffer of type: ${bufferType}.`);
  var bufferEvents = [];

  var bufferUpdate = onProgress.call(this, bufferType);
  videoElement.addEventListener('timeupdate', bufferUpdate, false);
  bufferEvents.push(bufferUpdate);

  var bufferSeek = onSeek.call(this, bufferType);
  videoElement.addEventListener('seeking', bufferSeek, false);
  bufferEvents.push(bufferSeek);

  return bufferEvents;
}

function removeVideoSourceEvents(bufferType) {
  log.info(`Removing video events for buffer of type: ${bufferType}.`);
  videoElement.removeEventListener('timeupdate', sourceEvents[bufferType][0], false);
  videoElement.removeEventListener('seeking', sourceEvents[bufferType][1], false);
  videoElement.onerror = undefined;
}

function onReset(eventId, metaManager) {
  var reset = function() {
    log.info(`Video reset.`);
    videoElement.removeEventListener('timeupdate', videoPing, false);
    clearInterval(eventId);

    if(sourceEvents[metaManager.Enum.VIDEO].length > 0) {
      removeVideoSourceEvents(metaManager.Enum.VIDEO);
    }

    if(sourceEvents[metaManager.Enum.AUDIO].length > 0) {
      removeVideoSourceEvents(metaManager.Enum.AUDIO);
    }

    removeSocketEvents();
  };
  return reset;
}

function onProgress(typeId) {
  var progress = function() {
    log.silly('Video.progress');
    if(metaData.isLastSegment(typeId, videoElement.currentTime)){
      var timeToRequest = metaData.isReadyForNextSegment(typeId, videoElement.currentTime);
      if(timeToRequest && timeToRequest === timeToRequest){
        log.debug(`Video.onProgress - time: ${timeToRequest} current: ${videoElement.currentTime}`);
        this.emit("get-segment", typeId, timeToRequest);
      }
    }
  }.bind(this);
  return progress;
}

function onSeek(typeId) {
  var seek = function() {
    log.debug(`Video.seek ${typeId}`);
    metaData.updateActiveMeta(typeId, metaData.getSegmentIndex(typeId, videoElement.currentTime));
    this.emit("seek-segment", typeId, videoElement.currentTime);
  }.bind(this);
  return seek;
}

function videoPing() {
  var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATE,
    [videoElement.currentTime, !videoElement.paused, videoElement.readyState === 4]);
  socket.request(eventKeys.PING, request);
}
