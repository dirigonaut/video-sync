var ClientLog         = require('../log/ClientLogManager');
var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../utils/RequestFactory.js');

var log = ClientLog.getLog();

function SourceBuffer(enum_type, video, metaManager, mediaSource){
  var self = {};

  self.type = enum_type;
  self.hasInitSeg = false;
  self.segmentsToBuffer = new Map();
  self.sourceBuffer = null;
  self.loadingSegment = null;
  self.index = 0;

  log.info('SourceBuffer.initialize');

  var getInit = function(){
    requestVideoData(metaManager.getActiveMetaData().getInit(self.type));
  };

  video.on('get-init', getInit);

  var getSegment = function(typeId, timestamp) {
    if(typeId == self.type) {
      if(!isTimeRangeBuffered(timestamp)) {
        log.info("get-segment", [typeId, timestamp]);
        var segmentInfo = metaManager.getActiveMetaData().getSegment(self.type, timestamp);
        if(segmentInfo !== null) {
          requestVideoData(segmentInfo);
        }
      }
    }
  };

  video.on('get-segment', getSegment);

  self.setSourceBufferCallback = function(spec) {
    return function(e) {
      console.log("SourceBuffer attached to MediaSource.")
      self.sourceBuffer = mediaSource.addSourceBuffer(spec);
      self.sourceBuffer.addEventListener('error',  self.objectState);
      self.sourceBuffer.addEventListener('abort',  self.objectState);
      self.sourceBuffer.addEventListener('update', self.getOnBufferUpdate());
      self.sourceBuffer.addEventListener('sourceopen', self.objectState);
      self.sourceBuffer.addEventListener('sourceend', self.clearEvents);
    };
  };

  self.bufferSegment = function(key, index, data) {
    var mapQueue = self.segmentsToBuffer.get(key);
    var chunk = data !== null ? new Uint8Array(data) : null;

    if(mapQueue !== undefined && mapQueue !== null) {
      console.log("Queue found");
      mapQueue.set(index, chunk);
    } else {
      console.log("Creating Queue");
      var mapQueue = new Map();
      self.segmentsToBuffer.set(key, mapQueue.set(index, chunk));
    }

    isReadyForNextSegment();

    if(!self.hasInitSeg) {
      log.info("Init segment has been received.", self.type);
      self.hasInitSeg = true;
      requestVideoData(metaManager.getActiveMetaData().getSegment(self.type, 0));
    }
  };

  self.getOnBufferUpdate = function() {
    return function(e) {
      console.log("getOnBufferUpdate");
      isReadyForNextSegment();
    }
  };

  var isReadyForNextSegment = function() {
    log.debug(`SourceBuffer isReadyForNextSegment ${self.type}`);
    if(!self.sourceBuffer.updating) {
      var bufferUpdated = false;

      do {
        var mapQueue = self.segmentsToBuffer.get(self.loadingSegment);

        if(mapQueue === undefined || mapQueue === null) {
          if(self.segmentsToBuffer.size > 0) {
            self.loadingSegment = self.segmentsToBuffer.keys().next().value;
            console.log(`Set loadingSegment to ${self.loadingSegment} and continuing`);
            continue;
          } else {
            self.loadingSegment = null;
            console.log(`Set loadingSegment to ${self.loadingSegment} and breaking`);
            break;
          }
        }

        if(mapQueue.size > self.index) {
          var segment = mapQueue.get(self.index);

          if(segment !== null) {
            console.log(`Appending from ${self.loadingSegment} mapQueue at index ${self.index} for buffer ${self.type}`);
            self.sourceBuffer.appendBuffer(segment);
            bufferUpdated = true;
            self.index++;
          } else {
            //console.log(self.segmentsToBuffer.get(self.loadingSegment).entries());
            console.log(`Removing entry ${self.loadingSegment} and resetting index`);
            self.segmentsToBuffer.delete(self.loadingSegment);
            self.index = 0;
          }
        } else {
          console.log(`mapQueue.size !> self.index breaking`);
          break;
        }
      } while(!bufferUpdated);
    }
  };

  self.objectState = function(e) {
    console.log(e);
    console.log(self);
    log.error("SourceBuffer's objectState", e);
  };

  self.clearEvents = function(e) {
    log.info("SourceBuffer's clearEvents");
    video.removeListener('get-init', getInit);
    video.removeListener('get-next', getNext);
    video.removeListener('get-segment', getSegment);

    self.sourceBuffer.removeEventListener('error',  self.objectState);
    self.sourceBuffer.removeEventListener('abort',  self.objectState);
    self.sourceBuffer.removeEventListener('update', self.getOnBufferUpdate);
    self.sourceBuffer.removeEventListener('sourceopen', self.objectState);
    self.sourceBuffer.removeEventListener('sourceend', self.clearEvents);
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
  }

  return self;
}

SourceBuffer.Enum = { "VIDEO" : 0, "AUDIO" : 1 };

module.exports = SourceBuffer;
