const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var video, buffers, metaManager, subtitles, schemaFactory, socket, eventKeys, resetMedia, log;

function MediaController() { }

MediaController.prototype.initialize = function() {
  if(typeof MediaController.prototype.protoInit === 'undefined') {
    MediaController.prototype.protoInit = true;
    Object.setPrototypeOf(MediaController.prototype, Events.prototype);
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createClientLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);

    metaManager     = this.factory.createMetaManager();
    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();
  }
};

MediaController.prototype.initializeMedia = Promise.coroutine(function* (domElements, resetOnly) {
  if(resetMedia) {
    yield resetMedia();
    resetMedia = undefined
  }

  if(!resetOnly) {
    resetMedia = yield setupMedia.call(this, domElements);
  }
});

MediaController.prototype.isMediaInitialized = function() {
  return resetMedia ? true : false;
};

MediaController.prototype.getTrackInfo = function() {
  return metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  log.debug('MediaController.setForceBuffer')
  var meta = metaManager.getActiveMetaData();

  if(meta.activeMeta.get(metaManager.Enums.TYPES.VIDEO)) {
    meta.setForceBuffer(metaManager.Enums.TYPES.VIDEO, forceBuffer);
  }

  if(meta.activeMeta.get(metaManager.Enums.TYPES.AUDIO)) {
    meta.setForceBuffer(metaManager.Enums.TYPES.AUDIO, forceBuffer);
  }
};

MediaController.prototype.setActiveMetaData = function(key, videoIndex, audioIndex) {
  var metaInfo = metaManager.buildMetaInfo(key, videoIndex, audioIndex);
  metaManager.setActiveMetaData(metaInfo);
};

module.exports = MediaController;

var setupMedia = Promise.coroutine(function* (domElements) {
  log.debug("MediaController.setup");
  yield metaManager.requestMetaData();
  this.emit('meta-data-loaded', metaManager.getTrackInfo());

  video   = this.factory.createVideo();
  buffers = [];

  var active = metaManager.getActiveMetaData();
  var mediaPromises = [video.setup(domElements.videoElement, domElements.window, domElements.mediaSource)];

  if(active.activeMeta.get(metaManager.Enums.TYPES.VIDEO)) {
    buffers[metaManager.Enums.TYPES.VIDEO] = this.factory.createSourceBuffer();
    mediaPromises.push(buffers[metaManager.Enums.TYPES.VIDEO].setup(metaManager.Enums.TYPES.VIDEO, domElements.mediaSource, video));

    buffers[metaManager.Enums.TYPES.VIDEO].once('init', function() { video.emit('get-segment', metaManager.Enums.TYPES.VIDEO, 0) });

    buffers[metaManager.Enums.TYPES.VIDEO].on('error', function(err) {
      video.resetVideoElementErrorState(err);
    }.bind(this));
  }

  if(active.activeMeta.get(metaManager.Enums.TYPES.AUDIO)) {
    buffers[metaManager.Enums.TYPES.AUDIO] = this.factory.createSourceBuffer();
    mediaPromises.push(buffers[metaManager.Enums.TYPES.AUDIO].setup(metaManager.Enums.TYPES.AUDIO, domElements.mediaSource, video));

    buffers[metaManager.Enums.TYPES.AUDIO].once('init', function() { video.emit('get-segment', metaManager.Enums.TYPES.AUDIO, 0) });

    buffers[metaManager.Enums.TYPES.AUDIO].on('error', function(err) {
      video.resetVideoElementErrorState(err);
    }.bind(this));
  }

  subtitles = this.factory.createSubtitles();
  subtitles.once('subtitle-loaded', function() { this.emit('subtitle-loaded'); }.bind(this));
  mediaPromises.push(subtitles.setup(domElements.videoElement, domElements.document));

  video.emit('get-init');
  var resetCallbacks = yield Promise.all(mediaPromises);

  domElements.mediaSource.addEventListener('error', log.error);
  return onReset.call(this, resetCallbacks, domElements.mediaSource);
});

function onReset(resets, mediaSource) {
  var resetMedia = function() {
    log.debug('MediaController.reset');

    for(var i = 0; i < buffers.length; ++i) {
      buffers[i].setForceStop();
    }

    var canEndStream = function() {
      var isUpdating = false;

      for(var i = 0; i < buffers.length; ++i) {
        if(buffers[i].sourceBuffer) {
          if(buffers[i].sourceBuffer.updating) {
            isUpdating = true;
          }
        }
      }

      if(!isUpdating) {
        if(mediaSource.readyState === 'open') {
          var active = metaManager.getActiveMetaData();

          if(active.activeMeta.get(metaManager.Enums.TYPES.VIDEO)) {
            buffers[metaManager.Enums.TYPES.VIDEO].removeListener('error', video.resetVideoElementErrorState);
          }

          if(active.activeMeta.get(metaManager.Enums.TYPES.AUDIO)) {
            buffers[metaManager.Enums.TYPES.AUDIO].removeListener('error', video.resetVideoElementErrorState);
          }

          for(let i = 0; i < resets.length; ++i) {
            resets[i]();
          }

          mediaSource.endOfStream();
          this.emit('media-reset');
        }
      } else {
        setTimeout(canEndStream, 250);
      }
    }.bind(this);

    setTimeout(canEndStream, 250);

    return new Promise(function(resolve, reject) {
      this.once('media-reset', resolve);
    }.bind(this));
  }.bind(this);
  return resetMedia;
}
