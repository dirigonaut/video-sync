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
    var videoSingleton = new VideoSingleton(videoElement, _this.metaManager.getActiveMetaData());

    var sourceBuffers = new Array(2);
    sourceBuffers[SourceBuffer.Enum.VIDEO] = initializeBuffer(SourceBuffer.Enum.VIDEO,
      videoSingleton, mediaSource, _this.metaManager);
    sourceBuffers[SourceBuffer.Enum.AUDIO] = initializeBuffer(SourceBuffer.Enum.AUDIO,
      videoSingleton, mediaSource, _this.metaManager);

    initializeVideo(videoSingleton, mediaSource);

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

var initializeVideo = function(videoSingleton, mediaSource) {
  var onTimeUpdateState = function() {
    clientSocket.sendRequest('state-time-update', new RequestFactory().buildVideoStateRequest(videoElement));
  };

  videoElement.currentTime = 0;
  videoElement.addEventListener('timeupdate', onTimeUpdateState, false);

  var videoUpdate = videoSingleton.onProgress(SourceBuffer.Enum.VIDEO);
  var audioUpdate = videoSingleton.onProgress(SourceBuffer.Enum.AUDIO);
  videoElement.addEventListener('timeupdate', videoUpdate, false);
  videoElement.addEventListener('timeupdate', audioUpdate, false);

  var videoSeek = videoSingleton.onSeek(SourceBuffer.Enum.VIDEO);
  var audioSeek = videoSingleton.onSeek(SourceBuffer.Enum.AUDIO);
  videoElement.addEventListener('seeking', videoSeek, false);
  videoElement.addEventListener('seeking', audioSeek, false);

  var resetVideo = function() {
    log.info(`Video reset.`);
    videoElement.removeEventListener('timeupdate', onTimeUpdateState, false);
    videoElement.removeEventListener('timeupdate', videoUpdate, false);
    videoElement.removeEventListener('timeupdate', audioUpdate, false);
    videoElement.removeEventListener('seeking', videoSeek, false);
    videoElement.removeEventListener('seeking', audioSeek, false);

    mediaSource.removeEventListener('sourceended', resetVideo);
  };

  mediaSource.addEventListener('sourceended', resetVideo);
};

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
