var ClientLog         = require('../log/ClientLogManager');
var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../utils/RequestFactory.js');

var log = ClientLog.getLog();

function SourceBuffer(enum_type, video, metaManager, mediaSource){
  var self = {};

  self.type = enum_type;
  self.sourceBuffer = null;
  self.hasInitSeg = false;
  self.forceStop = false;

  self.segmentsToBuffer = new Map();
  self.loadingSegment = null;
  self.index = 0;

  log.info(`SourceBuffer.initialize type: ${self.type}`);

  var getInit = function(){
    var initInfo = metaManager.getActiveMetaData().getInit(self.type);
    var key = `${initInfo[0]}-${initInfo[1][0]}-${initInfo[1][1]}-${self.type}`;
    self.segmentsToBuffer.set(key, new Map());
    self.loadingSegment = key;
    requestVideoData(initInfo);
  };

  video.on('get-init', getInit);

  var getSegment = function(typeId, timestamp) {
    if(typeId == self.type) {
      if(!isTimeRangeBuffered(timestamp)) {
        log.info("get-segment", [typeId, timestamp]);
        var segmentInfo = metaManager.getActiveMetaData().getSegment(self.type, timestamp);
        if(segmentInfo !== null) {
          var key = `${segmentInfo[0]}-${segmentInfo[1][0]}-${segmentInfo[1][1]}-${self.type}`;
          self.segmentsToBuffer.set(key, new Map());
          requestVideoData(segmentInfo);
          return key;
        }
      }
    }
    return null;
  };

  video.on('get-segment', getSegment);

  var seekSegment = function(typeId, timestamp) {
    var seekKey = getSegment(typeId, timestamp);

    if(seekKey !== null) {
      self.segmentsToBuffer.forEach(function(value, key, map) {
        if(key !== self.loadingSegment && key !== seekKey) {
          map.delete(key);
        }
      });
    }
  };

  video.on('seek-segment', seekSegment);

  self.setSourceBufferCallback = function(spec) {
    return function(e) {
      log.info("SourceBuffer attached to MediaSource.")
      self.sourceBuffer = mediaSource.addSourceBuffer(spec);
      self.sourceBuffer.addEventListener('error',  self.objectState);
      self.sourceBuffer.addEventListener('abort',  self.objectState);
      self.sourceBuffer.addEventListener('update', self.getOnBufferUpdate());
    };
  };

  self.bufferSegment = function(key, index, data) {
    var mapQueue = self.segmentsToBuffer.get(key);
    var chunk = data !== null ? new Uint8Array(data) : null;

    if(mapQueue !== undefined && mapQueue !== null) {
      log.debug(`Queue found for key: ${key}`);
      mapQueue.set(index, chunk);
    } else {
      log.debug(`Queue not found for key: ${key}`);
    }

    isReadyForNextSegment();

    if(!self.hasInitSeg) {
      log.info("Init segment has been received.", self.type);
      self.hasInitSeg = true;
      var segmentInfo = metaManager.getActiveMetaData().getSegment(self.type, 0);
      var key = `${segmentInfo[0]}-${segmentInfo[1][0]}-${segmentInfo[1][1]}-${self.type}`;
      self.segmentsToBuffer.set(key, new Map());
      requestVideoData(segmentInfo);
    }
  };

  self.getOnBufferUpdate = function() {
    return function(e) {
      log.debug("getOnBufferUpdate");
      isReadyForNextSegment();
    }
  };

  var isReadyForNextSegment = function() {
    log.debug(`SourceBuffer isReadyForNextSegment ${self.type}`);
    if(self.sourceBuffer !== undefined && self.sourceBuffer !== null && !self.sourceBuffer.updating) {
      var bufferUpdated = false;

      do {
        var mapQueue = self.segmentsToBuffer.get(self.loadingSegment);

        if(mapQueue === undefined || mapQueue === null) {
          if(self.forceStop) {
            break;
          } else if(self.segmentsToBuffer.size > 0) {
            self.loadingSegment = self.segmentsToBuffer.keys().next().value;
            log.debug(`Set loadingSegment to ${self.loadingSegment} and continuing`);
            continue;
          } else {
            self.loadingSegment = null;
            log.debug(`Set loadingSegment to ${self.loadingSegment} and breaking`);
            break;
          }
        }

        log.debug(`${mapQueue.size} > ${self.index} for type: ${self.type}`);
        if(mapQueue.size > self.index) {
          var segment = mapQueue.get(self.index);

          if(segment !== null) {
            if(segment !== undefined) {
              log.debug(`Appending from ${self.loadingSegment} mapQueue at index ${self.index} for buffer ${self.type}`);
              self.sourceBuffer.appendBuffer(segment);
              bufferUpdated = true;
              self.index++;
            } else {
              break;
            }
          } else {
            log.debug(`Removing entry ${self.loadingSegment} and resetting index`);
            self.segmentsToBuffer.delete(self.loadingSegment);
            self.index = 0;
          }
        } else {
          log.debug(`mapQueue.size !> self.index breaking`);
          break;
        }
      } while(!bufferUpdated);
    }
  };

  self.setForceStop = function() {
    self.forceStop = true;
  }

  self.objectState = function(e, p) {
    log.error("SourceBuffer's objectState", e);
  };

  self.clearEvents = function(e) {
    log.info("SourceBuffer's clearEvents");
    video.removeListener('get-init', getInit);
    video.removeListener('get-segment', getSegment);
    video.removeListener('seek-segment', seekSegment);

    self.sourceBuffer.removeEventListener('error',  self.objectState);
    self.sourceBuffer.removeEventListener('abort',  self.objectState);
    self.sourceBuffer.removeEventListener('update', self.getOnBufferUpdate);
  };

  var requestVideoData = function(requestDetails) {
    log.info('SourceBuffer.requestVideoData', requestDetails);
    new ClientSocket().sendRequest("get-segment",
      new RequestFactory().buildVideoSegmentRequest(self.type, requestDetails[0], requestDetails[1]), false);
  };

  var isTimeRangeBuffered = function(timestamp) {
    var buffered = false;
    var timeRanges = self.sourceBuffer.buffered;

    if(!metaManager.getActiveMetaData().isForceBuffer(self.type)) {
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

  return self;
}

SourceBuffer.Enum = { "VIDEO" : 0, "AUDIO" : 1 };

module.exports = SourceBuffer;
