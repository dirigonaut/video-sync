const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');


function MediaController() {
  this.metaManager = new MetaManager();
  this.metaManager.initialize();

  this.metaManager.on('meta-data-loaded', function() {
    this.emit('meta-data-loaded', this.metaManager.getTrackInfo());
    clientSocket.sendRequest('state-req-init');
  });

  this.on('meta-manager-ready', function() {
    this.metaManager.requestMetaData(fileBuffer);
  });
}

MediaController.prototype.initialize = function(force) {
  if(typeof MediaController.prototype.protoInit === 'undefined') {
    MediaController.prototype.protoInit = true;

  }

  if(force === undefined ? typeof MediaController.prototype.stateInit === 'undefined' : force) {
    MediaController.prototype.stateInit = true;

  }

  log.debug("MediaController.initialize");
  var _this = this;

  if(!this.initialized) {
    var setInitialized = function() {
      log.info('clientPlayerInitialized');
      _this.initialized = true;
      _this.syncPing = true;
      _this.emit('meta-manager-ready');

      if(callback) {
        callback();
      }
    };

    initializeClientPlayer(this, mediaSource, window, setInitialized);
  } else {
    this.emit('end-media-source');

    this.once('readyToInitialize', function() {
      log.info('clientPlayerInitialized');

      var getMedia = function() {
        if(downloadMeta) {
          _this.metaManager.initialize();
          _this.emit('meta-manager-ready');
        }

        if(callback !== null && callback !== undefined) {
          callback();
        }
      };

      initializeClientPlayer(_this, mediaSource, window, getMedia);
    });
  }
};

MediaController.prototype.reset = function() {

};

MediaController.prototype.getTrackInfo = function() {
  return this.metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  this.metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  log.debug('MediaController.setForceBuffer')
  var activeMeta = this.metaManager.getActiveMetaData();

  if(activeMeta.active.get(SourceBuffer.Enum.VIDEO)){
    activeMeta.setForceBuffer(SourceBuffer.Enum.VIDEO, forceBuffer);
  }

  if(activeMeta.active.get(SourceBuffer.Enum.AUDIO)){
    activeMeta.setForceBuffer(SourceBuffer.Enum.AUDIO, forceBuffer);
  }
};

MediaController.prototype.setActiveMetaData = function(key, videoIndex, audioIndex, subtitleIndex) {
  var metaInfo = this.metaManager.buildMetaInfo(key, videoIndex, audioIndex, subtitleIndex);
  this.metaManager.setActiveMetaData(metaInfo);
};

module.exports = MediaController;

var initializeClientPlayer = function(_this, mediaSource, window, callback) {
  var buildClientPlayer = function() {
    var activeMeta = _this.metaManager.getActiveMetaData();
    var videoSingleton = new VideoSingleton(videoElement, activeMeta);

    var sourceBuffers = [];
    var createVideo = activeMeta.active.get(SourceBuffer.Enum.VIDEO);
    if(createVideo !== null && createVideo !== undefined) {
      sourceBuffers[SourceBuffer.Enum.VIDEO] = initializeBuffer(SourceBuffer.Enum.VIDEO,
        videoSingleton, mediaSource, _this.metaManager);
    }

    var createAudio = activeMeta.active.get(SourceBuffer.Enum.AUDIO);
    if(createAudio !== null && createAudio !== undefined) {
      sourceBuffers[SourceBuffer.Enum.AUDIO] = initializeBuffer(SourceBuffer.Enum.AUDIO,
        videoSingleton, mediaSource, _this.metaManager);
    }

    initializeVideo(_this, videoSingleton, mediaSource);

    removeSocketEvents();
    setSocketEvents(_this, videoSingleton, sourceBuffers, new RequestFactory());

    var pingTimer = setInterval(function() {
      if(_this.syncPing) {
        clientSocket.sendRequest('state-sync-ping');
      }
    }, 1000);

    var resetMediaSource = function() {
      log.info("MediaSource Reset");
      delete videoSingleton._events;

      mediaSource.removeEventListener('sourceended', resetMediaSource);

      if(pingTimer) {
        clearInterval(pingTimer);
      }

      _this.metaManager.removeAllListeners('meta-data-activated');
      _this.emit('readyToInitialize');
    };

    mediaSource.addEventListener('sourceended', resetMediaSource);
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();

    _this.once('end-media-source', function() {
      for(var i in sourceBuffers) {
        sourceBuffers[i].setForceStop();
      }

      var canEndStream = function() {
        var isUpdating = false;

        for(var i in sourceBuffers) {
          if(sourceBuffers[i].sourceBuffer !== null && sourceBuffers[i].sourceBuffer !== undefined) {
            if(sourceBuffers[i].sourceBuffer.updating) {
              isUpdating = true;
            }
          }
        }

        if(!isUpdating) {
          if(mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
          }
        } else {
          setTimeout(canEndStream, 250);
        }
      };

      setTimeout(canEndStream, 250);
    });
  };

  _this.metaManager.on('meta-data-activated', buildClientPlayer);

  callback();
};

var initializeBuffer = function(typeId, videoSingleton, mediaSource, metaManager) {
  log.info(`Buffer of type: ${typeId} initialized.`);
  var sourceBuffer = new SourceBuffer(typeId, videoSingleton, metaManager, mediaSource);
  var codec = metaManager.getActiveMetaData().getMimeType(typeId);

  var bufferEvents = sourceBuffer.setSourceBufferCallback(codec);
  mediaSource.addEventListener('sourceopen', bufferEvents, false);

  var resetBuffer = function() {
    log.info(`Buffer of type: ${typeId} reset.`);
    mediaSource.removeSourceBuffer(sourceBuffer.sourceBuffer);
    mediaSource.removeEventListener('sourceopen', bufferEvents);
    mediaSource.removeEventListener('sourceended', resetBuffer);
    sourceBuffer.clearEvents();
  };

  mediaSource.addEventListener('sourceended', resetBuffer);

  return sourceBuffer;
};

var initializeVideo = function(_this, videoSingleton, mediaSource) {
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

var setSocketEvents = function(_this, videoSingleton, sourceBuffers, requestFactory) {
  clientSocket.setEvent('state-init', function() {
    log.debug("state-init");

    var onInit = function() {
      clientSocket.sendRequest('state-update-init', undefined, true);
    };

    videoSingleton.init(onInit);
  });

  clientSocket.setEvent('state-play', function() {
    log.debug("state-play");
    var video = videoSingleton.getVideoElement();
    videoSingleton.play();

    var request = new RequestFactory().buildVideoStateRequest(video);
    clientSocket.sendRequest('state-update-state', request, true);
  });

  clientSocket.setEvent('state-pause', function(command) {
    log.debug(`state-pause sync: ${isSynced}`);
    var video = videoSingleton.getVideoElement();
    videoSingleton.pause();

    var request = new RequestFactory().buildVideoStateRequest(video);
    clientSocket.sendRequest('state-update-state', request, true);

    if(command.sync) {
      clientSocket.sendRequest('state-sync');
    }
  });

  clientSocket.setEvent('state-seek', function(command) {
    log.debug("state-seek", data);
    var video = videoSingleton.getVideoElement();
    videoSingleton.pause();
    video.currentTime = command.time;

    if(command.play) {
      videoSingleton.play();
    }

    var request = new RequestFactory().buildVideoStateRequest(video);

    if(command.sync){
      clientSocket.sendRequest('state-update-sync', request, true);
    } else {
      clientSocket.sendRequest('state-update-state', request, true);
    }
  });

  clientSocket.setEvent('state-trigger-ping', function(command) {
    log.debug("state-trigger-ping");
    _this.syncPing = command.sync;
  });

  clientSocket.setEvent('segment-chunk', function(segment) {
    log.debug(`segment-chunk`);
    sourceBuffers[segment.typeId].bufferSegment(segment.name, segment.index, segment.data);
  });
}

var removeSocketEvents = function () {
  clientSocket.removeEvent('state-init');
  clientSocket.removeEvent('state-play');
  clientSocket.removeEvent('state-pause');
  clientSocket.removeEvent('state-seek');
  clientSocket.removeEvent('state-trigger-ping');
  clientSocket.removeEvent('segment-chunk');
};
