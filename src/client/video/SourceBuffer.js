const Promise = require('bluebird');

var metaManager, socket, schemaFactory, eventKeys, log;

function SourceBuffer() { }

SourceBuffer.prototype.initialize = function(force) {
  if(typeof SourceBuffer.prototype.protoInit === 'undefined') {
    SourceBuffer.prototype.protoInit = true;
    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.LogEnum.VIDEO);

    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();
    metaManager     = this.factory.createMetaManager();
    eventKeys       = this.factory.createKeys();
  }
};

SourceBuffer.prototype.setup = Promise.coroutine(function* (bufferType, mediaSource, video) {
  log.info(`SourceBuffer.initialize type: ${bufferType}`);
  if(bufferType !== 'undefined' && mediaSource) {
    this.type = bufferType;
    this.sourceBuffer;
    this.forceStop = false;

    this.segmentsToBuffer = new Map();
    this.loadingSegment;
    this.index = 0;

    var events = {
      init:       onInit.call(this),
      getSegment: onGetSegment.call(this),
      onSegment:  onSegment.call(this),
      ready:      onReady.call(this),
      seek:       onSeek.call(this)
    };

    var metaData = metaManager.getActiveMetaData();
    var spec     = metaData.getMimeType(this.type);

    video.on('get-init',events.init);
    video.on('get-segment', events.getSegment);
    video.on('seek-segment', events.seek);

    socket.setEvent(eventKeys.SEGMENTCHUNK, events.onSegment);

    var sourceOpened = new Promise(function(resolve, reject) {
      var onSourceOpen = function() {
        log.info("SourceBuffer attached to MediaSource.");
        try {
          this.sourceBuffer = mediaSource.addSourceBuffer(spec);
          this.sourceBuffer.addEventListener('error',  log.error);
          this.sourceBuffer.addEventListener('abort',  log.error);
          this.sourceBuffer.addEventListener('update', events.ready);
          resolve();
        } catch(err) {
          throw new Error('SourceBuffer.onSourceOpen spec mimeType is not defined.', err);
        }

        mediaSource.removeEventListener('sourceopen', onSourceOpen);
        mediaSource.removeEventListener('error', onReject);
      }.bind(this);

      var onReject = function(err) {
        mediaSource.removeEventListener('sourceopen', onSourceOpen);
        mediaSource.removeEventListener('error', onReject);
        reject(err);
      };

      mediaSource.addEventListener('sourceopen', onSourceOpen);
      mediaSource.addEventListener('error', onReject);
    }.bind(this));

    yield sourceOpened

    return new Promise.resolve(onReset.call(this, video, mediaSource, events));
  } else {
    throw new Error('enumType and/or mediaSource is not defined.');
  }
});

SourceBuffer.prototype.setForceStop = function() {
  this.forceStop = true;
};

module.exports = SourceBuffer;

function onInit() {
  var getInit = function() {
    log.debug(`SourceBuffer of type ${this.type} getInit.`);
    var initInfo = metaManager.getActiveMetaData().getInit(this.type);
    var key = `${initInfo[0]}-${initInfo[1][0]}-${initInfo[1][1]}-${this.type}`;
    this.segmentsToBuffer.set(key, new Map());
    this.loadingSegment = key;
    requestVideoData.call(this, initInfo);
  }.bind(this);
  return getInit;
}

function onGetSegment() {
  var getSegment = function(typeId, timestamp) {
    if(typeId == this.type) {
      if(!isTimeRangeBuffered.call(this, timestamp)) {
        log.info('segment', [typeId, timestamp]);
        var segmentInfo = metaManager.getActiveMetaData().getSegment(this.type, timestamp);
        if(segmentInfo) {
          var key = `${segmentInfo[0]}-${segmentInfo[1][0]}-${segmentInfo[1][1]}-${this.type}`;
          this.segmentsToBuffer.set(key, new Map());
          requestVideoData.call(this, segmentInfo);
          return key;
        }
      }
    }
  }.bind(this);
  return getSegment;
}

function onSegment() {
  var buffer = bufferSegment.call(this);
  var segment = function(segment) {
    if(this.type === segment.typeId) {
      buffer(segment.name, segment.index, segment.data);
    }
  }.bind(this);
  return segment;
}

function bufferSegment() {
  var isReadyForNextSegment = onReady.call(this);
  var buffer = function(key, index, data) {
    var mapQueue = this.segmentsToBuffer.get(key);
    var chunk = data !== null ? data : null;

    if(mapQueue) {
      log.debug(`Queue found for key: ${key}`);
      mapQueue.set(index, chunk);
    } else {
      log.debug(`Queue not found for key: ${key}`);
    }

    isReadyForNextSegment();

    if(!this.hasInitSeg) {
      log.info(`Init segment has been received: ${this.type}`);
      this.hasInitSeg = true;
      var segmentInfo = metaManager.getActiveMetaData().getSegment(this.type, 0);
      var key = `${segmentInfo[0]}-${segmentInfo[1][0]}-${segmentInfo[1][1]}-${this.type}`;
      this.segmentsToBuffer.set(key, new Map());
      requestVideoData.call(this, segmentInfo);
    }
  }.bind(this);
  return buffer;
}

function onReady() {
  var isReadyForNextSegment = function() {
    log.debug(`SourceBuffer isReadyForNextSegment ${this.type}`);
    if(this.sourceBuffer && !this.sourceBuffer.updating) {
      var bufferUpdated = false;

      do {
        var mapQueue = this.segmentsToBuffer.get(this.loadingSegment);

        if(!mapQueue) {
          if(this.forceStop) {
            break;
          } else if(this.segmentsToBuffer.size > 0) {
            this.loadingSegment = this.segmentsToBuffer.keys().next().value;
            log.debug(`Set loadingSegment to ${this.loadingSegment} and continuing`);
            continue;
          } else {
            this.loadingSegment = null;
            log.debug(`Set loadingSegment to ${this.loadingSegment} and breaking`);
            break;
          }
        }

        log.debug(`${mapQueue.size} > ${this.index} for type: ${this.type}`);
        if(mapQueue.size > this.index) {
          var segment = mapQueue.get(this.index);

          if(segment !== null) {
            if(segment) {
              log.debug(`Appending from ${this.loadingSegment} mapQueue at index ${this.index} for buffer ${this.type}`);
              this.sourceBuffer.appendBuffer(segment);
              bufferUpdated = true;
              this.index++;
            } else {
              break;
            }
          } else {
            log.debug(`Removing entry ${this.loadingSegment} and resetting index`);
            this.segmentsToBuffer.delete(this.loadingSegment);
            this.index = 0;
          }
        } else {
          log.debug(`mapQueue.size !> self.index breaking`);
          break;
        }
      } while(!bufferUpdated);
    }
  }.bind(this);
  return isReadyForNextSegment;
}

function onSeek() {
  var getSegment = onGetSegment.call(this);
  var seekSegment = function(typeId, timestamp) {
    var seekKey = getSegment(typeId, timestamp);

    if(seekKey) {
      this.segmentsToBuffer.forEach(function(value, key, map) {
        if(key !== this.loadingSegment && key !== seekKey) {
          map.delete(key);
        }
      });
    }
  }.bind(this);
  return seekSegment;
}

function onReset(video, mediaSource, events) {
  var reset = function() {
    log.info(`SourceBuffer.reset: ${this.type}`);
    video.removeListener('get-init', events.init);
    video.removeListener('get-segment', events.getSegment);
    video.removeListener('seek-segment', events.seek);

    this.sourceBuffer.removeEventListener('error',  log.error);
    this.sourceBuffer.removeEventListener('abort',  log.error);
    this.sourceBuffer.removeEventListener('update', events.ready);

    socket.removeEvent(eventKeys.SEGMENTCHUNK, events.onSegment);
    mediaSource.removeSourceBuffer(this.sourceBuffer);
  }.bind(this);
  return reset;
}

var requestVideoData = function(requestDetails) {
  socket.request(eventKeys.SEGMENT, schemaFactory.createPopulatedSchema(schemaFactory.Enum.VIDEO, [this.type, requestDetails[0], requestDetails[1]]));
};

var isTimeRangeBuffered = function(timestamp) {
  var buffered = false;
  var timeRanges = this.sourceBuffer.buffered;

  if(!metaManager.getActiveMetaData().isForceBuffer(this.type)) {
    for(var i = 0; i < timeRanges.length; ++i) {
      if(timeRanges.start(i) > timestamp) {
        break;
      } else if (timeRanges.end(i) > timestamp) {
        buffered = true;
        break;
      }
    }
  }

  return buffered;
};
