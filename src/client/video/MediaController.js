const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var video, buffers, metaManager, schemaFactory, syncPing, log;

function MediaController() { }

MediaController.prototype.initialize = function(force) {
  if(typeof MediaController.prototype.protoInit === 'undefined') {
    MediaController.prototype.protoInit = true;
    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.LogEnum.VIDEO);

    metaManager = this.factory.createMetaManager();
  }
};

MediaController.prototype.setup = Promise.coroutine(function* (mediaSource, window, videoElement) {
  log.debug("MediaController.setup");
  yield metaManager.requestMetaData();
  this.emit('meta-data-loaded', metaManager.getTrackInfo());

  socket.request('state-req-init');
  yield initializeClientPlayer.call(this, mediaSource, window);

  this.syncPing = true;
};

MediaController.prototype.reset = Promise.coroutine(function* () {
  this.emit('end-media-source');
};

MediaController.prototype.getTrackInfo = function() {
  return metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  this.metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  log.debug('MediaController.setForceBuffer')
  var activeMeta = metaManager.getActiveMetaData();

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

var initializeClientPlayer = function(mediaSource, window) {
  var activeMeta = metaManager.getActiveMetaData();
  video = this.factory.createVideo();
  video.setVideoElement(videoElement);
  var buffers

  removeSocketEvents();
  setSocketEvents.call(this, videoSingleton, sourceBuffers);

  var pingTimer = setInterval(function() {
    if(_this.syncPing) {
      clientSocket.request('state-sync-ping');
    }
  }, 1000);

  var resetMediaSource = function() {
    log.info("MediaSource Reset");
    delete videoSingleton._events;

    mediaSource.removeEventListener('sourceended', resetMediaSource);

    if(pingTimer) {
      clearInterval(pingTimer);
    }

    metaManager.removeAllListeners('meta-data-activated');
    this.emit('readyToInitialize');

    mediaSource.addEventListener('sourceended', resetMediaSource);
    videoElement.src = window.URL.createObjectURL(mediaSource);
    videoElement.load();

    this.once('end-media-source', function() {
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
};

var setSocketEvents = function(_this, videoSingleton, sourceBuffers, requestFactory) {
  socket.setEvent('state-init', function() {
    log.debug("state-init");
    yield videoSingleton.setup();
    socket.request('state-update-init', undefined, true);
  });

  clientSocket.setEvent('state-play', function() {
    log.debug("state-play");
    var video = videoSingleton.getVideoElement();
    videoSingleton.play();

    var request = schemaFactory;
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
