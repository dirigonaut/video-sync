const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var video, buffers, metaManager, schemaFactory, socket, eventKeys, log;

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

MediaController.prototype.setup = Promise.coroutine(function* (mediaSource, window, videoElement) {
  log.debug("MediaController.setup");
  yield metaManager.requestMetaData();
  this.emit('meta-data-loaded', metaManager.getTrackInfo());

  video = this.factory.createVideo();

  var active = metaManager.getActiveMetaData();
  var mediaPromises = [video.setup(videoElement, window, mediaSource)];
  buffers = [];

  if(active.activeMeta.get(metaManager.Enum.VIDEO)) {
    buffers[metaManager.Enum.VIDEO] = this.factory.createSourceBuffer();
    mediaPromises.push(buffers[metaManager.Enum.VIDEO].setup(metaManager.Enum.VIDEO, mediaSource, video));
  }

  if(active.activeMeta.get(metaManager.Enum.AUDIO)) {
    buffers[metaManager.Enum.AUDIO] = this.factory.createSourceBuffer();
    mediaPromises.push(buffers[metaManager.Enum.AUDIO].setup(metaManager.Enum.AUDIO, mediaSource, video));
  }

  var resetCallbacks = yield Promise.all(mediaPromises);
  video.emit('get-init');

  return onReset.call(this, resetCallbacks, mediaSource);
});

MediaController.prototype.getTrackInfo = function() {
  return metaManager.getTrackInfo();
};

MediaController.prototype.setBufferAhead = function(bufferThreshold) {
  this.metaManager.setBufferThreshold(bufferThreshold);
};

MediaController.prototype.setForceBuffer = function(forceBuffer) {
  log.debug('MediaController.setForceBuffer')
  var activeMeta = metaManager.getActiveMetaData();

  if(activeMeta.active.get(metaManager.Enum.VIDEO)){
    activeMeta.setForceBuffer(metaManager.Enum.VIDEO, forceBuffer);
  }

  if(activeMeta.active.get(metaManager.Enum.AUDIO)){
    activeMeta.setForceBuffer(metaManager.Enum.AUDIO, forceBuffer);
  }
};

MediaController.prototype.setActiveMetaData = function(key, videoIndex, audioIndex, subtitleIndex) {
  var metaInfo = this.metaManager.buildMetaInfo(key, videoIndex, audioIndex, subtitleIndex);
  this.metaManager.setActiveMetaData(metaInfo);
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
          for(let i = 0; i < resets.length; ++i) {
            console.log(`reset[${i}]`)
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
