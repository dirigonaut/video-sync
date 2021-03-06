const Promise = require("bluebird");
const Events  = require("events");

var videoElement, sourceEvents, metaData, socket, schemaFactory, eventKeys, log;

function Video() { }

Video.prototype.initialize = function(force) {
  if(typeof Video.prototype.protoInit === "undefined") {
    Video.prototype.protoInit = true;
    Object.setPrototypeOf(Video.prototype, Events.prototype);
    eventKeys       = this.factory.createKeys();
    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();

    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.Enums.LOGS.VIDEO);
  }
};

Video.prototype.setup = function(element, window, mediaSource) {
  log.debug("Video.setup");
  if(element) {
    videoElement = element;
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();
    videoElement.currentTime = 0;

    videoElement.addEventListener("timeupdate", videoPing);
    videoElement.addEventListener("error", logVideoElementErrors.call(this));

    var eventId = setInterval(function() {
      if(videoElement.pause) {
        videoPing();
      }
    }, 1000);

    var metaManager = this.factory.createMetaManager();
    metaData = metaManager.getActiveMetaData();
    sourceEvents = [];

    if(metaData && metaData.activeMeta) {
      if(metaData.activeMeta.get(metaManager.Enums.TYPES.VIDEO)) {
        sourceEvents[metaManager.Enums.TYPES.VIDEO] = setVideoSourceEvents.call(this, metaManager.Enums.TYPES.VIDEO);
      }

      if(metaData.activeMeta.get(metaManager.Enums.TYPES.AUDIO)) {
        sourceEvents[metaManager.Enums.TYPES.AUDIO] = setVideoSourceEvents.call(this, metaManager.Enums.TYPES.AUDIO);
      }
    } else {
      throw new Error("Video.setup: metaData.activeMeta is not defined.");
    }

    setSocketEvents();

    return new Promise.resolve(onReset.call(this, eventId, metaManager));
  } else {
    throw new Error("Video.setup: element is not defined.");
  }
};

Video.prototype.getVideoElement = function() {
  return videoElement;
};

Video.prototype.resetVideoElementErrorState = function() {
  videoElement.error = undefined;
};

module.exports = Video;

function play() {
  log.debug("Video.play");
  if([3,4].indexOf(videoElement.readyState) > -1) {
    log.debug("Set video to play");
    videoElement.play().catch(function(e) {
      log.error(e);
      log.ui(e);
    });
  } else {
    log.debug("Set video to play when canplay");
    videoElement.addEventListener("canplay", videoElement.play, {"once": true});
  }
}

function pause() {
  log.debug("Video.pause");
  videoElement.pause();
  videoElement.removeEventListener("canplay", videoElement.play, {"once": true});
}

function setSocketEvents() {
  log.debug("Video.setSocketEvents");

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

  var interval;
  socket.setEvent(eventKeys.SEEK, function(command) {
    log.debug(eventKeys.SEEK, command);

    if (isFinite( parseFloat(command.time))) {
      if(!command.play) {
        pause();
      } else {
        play();
      }

      videoElement.currentTime = parseFloat(command.time);
      videoPing();

      if(interval) {
        clearInterval(interval);
      }

      interval = setInterval(function() {
        if(videoElement.readyState < 2) {
          videoElement.currentTime = parseFloat(command.time);
        } else {
          clearInterval(interval);
        }
      }, 2500);
    }
  });
}

function removeSocketEvents() {
  log.debug("Video.removeSocketEvents");
  socket.removeEvent(eventKeys.PLAY);
  socket.removeEvent(eventKeys.PAUSE);
  socket.removeEvent(eventKeys.SEEK);
}

function setVideoSourceEvents(bufferType) {
  log.info(`Creating video events for buffer of type: ${bufferType}.`);
  var bufferEvents = [];

  var bufferUpdate = onProgress.call(this, bufferType);
  videoElement.addEventListener("timeupdate", bufferUpdate, false);
  bufferEvents.push(bufferUpdate);

  var bufferSeek = onSeek.call(this, bufferType);
  videoElement.addEventListener("seeking", bufferSeek, false);
  bufferEvents.push(bufferSeek);

  return bufferEvents;
}

function removeVideoSourceEvents(bufferType) {
  log.info(`Removing video events for buffer of type: ${bufferType}.`);
  videoElement.removeEventListener("timeupdate", sourceEvents[bufferType][0]);
  videoElement.removeEventListener("seeking", sourceEvents[bufferType][1]);
  videoElement.removeEventListener("error", logVideoElementErrors.call(this));
}

function onReset(eventId, metaManager) {
  var reset = function() {
    log.info(`Video reset.`);
    videoElement.removeEventListener("timeupdate", videoPing, false);
    clearInterval(eventId);

    if(sourceEvents[metaManager.Enums.TYPES.VIDEO].length > 0) {
      removeVideoSourceEvents(metaManager.Enums.TYPES.VIDEO);
    }

    if(sourceEvents[metaManager.Enums.TYPES.AUDIO].length > 0) {
      removeVideoSourceEvents(metaManager.Enums.TYPES.AUDIO);
    }

    removeSocketEvents();
  }.bind(this);

  return reset;
}

function onProgress(typeId) {
  var progress = function() {
    if(metaData.isLastSegment(typeId, videoElement.currentTime)) {
      var timeToRequest = metaData.isReadyForNextSegment(typeId, videoElement.currentTime);
      if(timeToRequest !== undefined && timeToRequest === timeToRequest){
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
    this.emit("get-segment", typeId, videoElement.currentTime);
  }.bind(this);
  return seek;
}

function videoPing() {
  var request = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATE,
    [videoElement.currentTime, !videoElement.paused, videoElement.readyState >= 2]);
  socket.request(eventKeys.PING, request);
}

function logVideoElementErrors() {
  var handleErrors = function() {
    log.error(videoElement.error.message, { errorCode: videoElement.error.code});
    this.emit("media-error", videoElement.error.code);
  }.bind(this);
  return handleErrors;
}
