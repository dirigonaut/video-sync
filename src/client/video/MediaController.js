const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var video, buffers, metaManager, subtitles, schemaFactory, socket, eventKeys, log;

function MediaController() { }

MediaController.prototype.initialize = function(force) {
  if(typeof MediaController.prototype.protoInit === 'undefined') {
    MediaController.prototype.protoInit = true;
    Object.setPrototypeOf(MediaController.prototype, Events.prototype);
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createClientLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);

    metaManager     = this.factory.createMetaManager();
    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();
  }
};

MediaController.prototype.setup = Promise.coroutine(function* (domElements) {
  log.debug("MediaController.setup");
  yield metaManager.requestMetaData();
  this.emit('meta-data-loaded', metaManager.getTrackInfo());

  video = this.factory.createVideo();

  var active = metaManager.getActiveMetaData();
  var mediaPromises = [video.setup(domElements.videoElement, domElements.window, domElements.mediaSource)];
  buffers = [];

  if(active.activeMeta.get(metaManager.Enum.VIDEO)) {
    buffers[metaManager.Enum.VIDEO] = this.factory.createSourceBuffer();
    mediaPromises.push(buffers[metaManager.Enum.VIDEO].setup(metaManager.Enum.VIDEO, domElements.mediaSource, video));

    buffers[metaManager.Enum.VIDEO].once('init', function() { video.emit('get-segment', metaManager.Enum.VIDEO,
      video.getVideoElement().currentTime ? video.getVideoElement().currentTime : 0) });

    buffers[metaManager.Enum.VIDEO].on('error', video.resetVideoElementErrorState);
  }

  if(active.activeMeta.get(metaManager.Enum.AUDIO)) {
    buffers[metaManager.Enum.AUDIO] = this.factory.createSourceBuffer();
    mediaPromises.push(buffers[metaManager.Enum.AUDIO].setup(metaManager.Enum.AUDIO, domElements.mediaSource, video));

    buffers[metaManager.Enum.AUDIO].once('init', function() { video.emit('get-segment', metaManager.Enum.AUDIO,
      video.getVideoElement().currentTime ? video.getVideoElement().currentTime : 0) });

    buffers[metaManager.Enum.AUDIO].on('error', video.resetVideoElementErrorState);
  }

  subtitles = this.factory.createSubtitles();
  subtitles.once('subtitle-loaded', function() { this.emit('subtitle-loaded'); }.bind(this));
  mediaPromises.push(subtitles.setup(domElements.videoElement, domElements.document));

  video.emit('get-init');
  var resetCallbacks = yield Promise.all(mediaPromises);

  domElements.mediaSource.addEventListener('error', log.error);
  return onReset.call(this, resetCallbacks, domElements.mediaSource);
});

MediaController.prototype.getTrackInfo = function() {
  return metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  log.debug('MediaController.setForceBuffer')
  var meta = metaManager.getActiveMetaData();

  if(meta.activeMeta.get(metaManager.Enum.VIDEO)) {
    meta.setForceBuffer(metaManager.Enum.VIDEO, forceBuffer);
  }

  if(meta.activeMeta.get(metaManager.Enum.AUDIO)) {
    meta.setForceBuffer(metaManager.Enum.AUDIO, forceBuffer);
  }
};

MediaController.prototype.setActiveMetaData = function(key, videoIndex, audioIndex, subtitleIndex) {
  var metaInfo = metaManager.buildMetaInfo(key, videoIndex, audioIndex, subtitleIndex);
  metaManager.setActiveMetaData(metaInfo);
};

module.exports = MediaController;

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

          if(active.activeMeta.get(metaManager.Enum.VIDEO)) {
            buffers[metaManager.Enum.VIDEO].removeListener('error', video.resetVideoElementErrorState);
          }

          if(active.activeMeta.get(metaManager.Enum.AUDIO)) {
            buffers[metaManager.Enum.AUDIO].removeListener('error', video.resetVideoElementErrorState);
          }

          for(let i = 0; i < resets.length; ++i) {
            resets[i]();
          }

          mediaSource.endOfStream();
          mediaSource.removeEventListener('error',  log.error);
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
