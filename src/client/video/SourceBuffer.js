const Promise = require('bluebird');
const Events  = require('events');

var metaManager, socket, schemaFactory, eventKeys, log;

function SourceBuffer() { }

SourceBuffer.prototype.initialize = function(force) {
  if(typeof SourceBuffer.prototype.protoInit === 'undefined') {
    SourceBuffer.prototype.protoInit = true;
    Object.setPrototypeOf(SourceBuffer.prototype, Events.prototype);

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
  if(typeof bufferType !== 'undefined' && mediaSource) {
    this.bufferLog = [];
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
    };

    var metaData = metaManager.getActiveMetaData();
    var spec     = metaData.getMimeType(this.type);

    video.on('get-init', events.init);
    video.on('get-segment', events.getSegment);

    socket.setEvent(eventKeys.SEGMENTCHUNK, events.onSegment);

    var sourceOpened = new Promise(function(resolve, reject) {
      var onSourceOpen = function() {
        log.info("SourceBuffer attached to MediaSource.");
        try {
          this.sourceBuffer = mediaSource.addSourceBuffer(spec);
          this.sourceBuffer.addEventListener('error', logBufferEntries.call(this));
          this.sourceBuffer.addEventListener('abort', log.error);
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
      log.info('segment', [typeId, timestamp]);
      if(!isTimeRangeBuffered.call(this, timestamp)) {
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
      this.bufferLog.push(`Received segment data: ${segment.name} at index: ${segment.index} of size: ${segment.data ? segment.data.byteLength : null}`);
      buffer(segment.name, segment.index, segment.data);
    }
  }.bind(this);
  return segment;
}

function bufferSegment() {
  var isReadyForNextSegment = onReady.call(this);
  var buffer = function(key, index, data) {
    var mapQueue = this.segmentsToBuffer.get(key);

    if(mapQueue) {
      if(mapQueue.get(index) === undefined) {
        mapQueue.set(index, data);
      }
    } else {
      this.bufferLog.push(`Queue not found for key: ${key} in ${Array.from(this.segmentsToBuffer.keys())} at index: ${index}`);
    }

    isReadyForNextSegment();

    if(!this.hasInitSeg) {
      this.hasInitSeg = true;
      this.emit('init');
    }
  }.bind(this);
  return buffer;
}

function onReady() {
  var logBuffer = logBufferEntries.call(this);
  var isReadyForNextSegment = function() {
    log.silly(`SourceBuffer isReadyForNextSegment ${this.type}`);
    if(this.sourceBuffer && !this.sourceBuffer.updating) {
      if(typeof this.loadingSegment === 'undefined' && !this.forceStop) {
        if(this.segmentsToBuffer.size > 0) {
          this.loadingSegment = this.segmentsToBuffer.keys().next().value;
          this.bufferLog.push(`Set loadingSegment to ${this.loadingSegment} and continuing`);
        }
      }

      var mapQueue = this.segmentsToBuffer.get(this.loadingSegment);
      log.debug(`For buffer ${this.type} with key: ${this.loadingSegment}: ${mapQueue ? Array.from(mapQueue.keys()) : 'undefined'}.length(${mapQueue ? mapQueue.size : 'undefined'}) > ${this.index} which is null: ${mapQueue ? mapQueue.get(this.index) === null : 'mapQueue is undefined'}`);
      if(mapQueue && mapQueue.size > this.index) {
        var segment = mapQueue.get(this.index);

        if(segment) {
          this.bufferLog.push(`Appending from this.segmentsToBuffer.get(${this.loadingSegment}).get(${this.index}).length === ${segment ? segment.byteLength : segment} for buffer ${this.type}`);
          try {
            this.sourceBuffer.appendBuffer(segment);
            this.index++;
          } catch (err) {
            this.segmentsToBuffer.delete(this.loadingSegment);
            this.segmentsToBuffer.set(this.loadingSegment, new Map());
            this.index = 0;

            logBuffer(err);
            this.emit('error');
          }
        } else if(segment === null) {
          this.bufferLog.push(`Deleting segments: ${Array.from(this.segmentsToBuffer.get(this.loadingSegment).keys())} for key: ${this.loadingSegment}`);
          this.segmentsToBuffer.delete(this.loadingSegment);
          this.index = 0;
          this.loadingSegment = undefined;
        }
      }
    }
  }.bind(this);
  return isReadyForNextSegment;
}

function onReset(video, mediaSource, events) {
  var reset = function() {
    log.info(`SourceBuffer.reset: ${this.type}`);
    video.removeListener('get-init', events.init);
    video.removeListener('get-segment', events.getSegment);

    this.sourceBuffer.removeEventListener('error', logBufferEntries.call(this));
    this.sourceBuffer.removeEventListener('abort', log.error);
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
  if(typeof this.sourceBuffer !== 'undefined') {
    var timeRanges = this.sourceBuffer.buffered;

    for(var i = 0; i < timeRanges.length; ++i) {
      if(timeRanges.start(i) > timestamp) {
        break;
      } else if (timeRanges.end(i) > timestamp) {
        buffered = true;
        break;
      }
    }
  }

  return metaManager.getActiveMetaData().isForceBuffer(this.type) ? false : buffered;
};

var logBufferEntries = function() {
  var logging = function(err) {
    log.error(err);
    console.log(this.bufferLog);
  }.bind(this);

  return logging;
};
