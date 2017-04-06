const Util          = require('util');
const EventEmitter  = require('events');

var MetaManager     = require('./MetaManager.js');
var SourceBuffer    = require('./SourceBuffer.js');
var VideoSingleton  = require('./VideoSingleton.js');
var ClientSocket    = require('../socket/ClientSocket.js');
var RequestFactory  = require('../utils/RequestFactory.js');
var ClientLog       = require('../log/ClientLogManager');

var log             = ClientLog.getLog();
var clientSocket    = new ClientSocket();

var videoElement    = null;
var fileBuffer      = null;

function MediaController(video, fBuffer) {
  console.log("MediaController");
  this.metaManager = new MetaManager();
  this.metaManager.initialize();

  this.initialized = false;

  fileBuffer = fBuffer;
  videoElement = video;

  var _this = this;
  this.metaManager.on('meta-data-loaded', function() {
    _this.emit('meta-data-loaded', _this.metaManager.getTrackInfo());
    clientSocket.sendRequest('state-req-init');
  });

  _this.on('meta-manager-ready', function() {
    _this.metaManager.requestMetaData(fileBuffer);
  });
}

Util.inherits(MediaController, EventEmitter);

MediaController.prototype.initialize = function(mediaSource, window, downloadMeta, callback) {
  log.debug("MediaController.initialize");
  var _this = this;

  if(!this.initialized) {
    var setInitialized = function() {
      log.info('clientPlayerInitialized');
      _this.initialized = true;
      _this.syncPing = true;
      _this.emit('meta-manager-ready');

      if(callback !== null && callback !== undefined) {
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

MediaController.prototype.getTrackInfo = function() {
  return this.metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  this.metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  log.debug('MediaController.setForceBuffer')
  var activeMeta = this.metaManager.getActiveMetaData();

  activeMeta.setForceBuffer(SourceBuffer.Enum.VIDEO, forceBuffer);
  activeMeta.setForceBuffer(SourceBuffer.Enum.AUDIO, forceBuffer);
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
  };

  _this.once('end-media-source', function() {
    mediaSource.endOfStream();
  });

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

  if(activeMeta.active.get(SourceBuffer.Enum.VIDEO) !== undefined) {
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
  clientSocket.setEvent('state-init', function(callback) {
    log.debug("state-init");
    var video = videoSingleton.getVideoElement();
    videoSingleton.init(callback);
  });

  clientSocket.setEvent('state-play', function(callback) {
    log.debug("state-play");
    var video = videoSingleton.getVideoElement();
    videoSingleton.play();
    callback(clientSocket.getSocketId(), video.currentTime, video.paused);
  });

  clientSocket.setEvent('state-pause', function(isSynced, callback) {
    log.debug("state-pause");
    var video = videoSingleton.getVideoElement();
    videoSingleton.pause();
    callback(clientSocket.getSocketId(), video.currentTime, video.paused);

    if(isSynced) {
      clientSocket.sendRequest('state-sync');
    }
  });

  clientSocket.setEvent('state-seek', function(data, callback) {
    log.debug("state-seek", data);
    var video = videoSingleton.getVideoElement();
    videoSingleton.pause();
    video.currentTime = data.seektime;

    callback(clientSocket.getSocketId(), video.currentTime, video.paused);
  });

  clientSocket.setEvent('state-trigger-ping', function(data) {
    log.debug("state-trigger-ping");
    _this.syncPing = data;
  });

  clientSocket.setEvent('segment-chunk', function(segment){
    log.debug('segment-chunk');
    sourceBuffers[segment.typeId].bufferSegment(segment.name, segment.index, segment.data);
  });
}

var removeSocketEvents = function () {
  clientSocket.clearEvent('state-init');
  clientSocket.clearEvent('state-play');
  clientSocket.clearEvent('state-pause');
  clientSocket.clearEvent('state-seek');
  clientSocket.clearEvent('state-trigger-ping');
  clientSocket.clearEvent('segment-chunk');
}
