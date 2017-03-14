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

  self.bufferSegment = function(key, data) {
    console.log(key);
    if (self.sourceBuffer.updating || mediaSource.readyState != "open" || self.segmentsToBuffer.size > 0) {
      console.log("Appending to list");
      var queue = self.segmentsToBuffer.get(key);
      var chunk = data !== null ? new Uint8Array(data) : null;

      if(queue !== undefined && queue !== null) {
        console.log("Queue found");
        queue.push(chunk);
      } else {
        console.log("Creaging Queue");
        self.segmentsToBuffer.set(key, [chunk]);
      }
    } else if(!self.sourceBuffer.updating) {
      if(self.loadingSegment === null) {
        console.log(`self.loadingSegment for bufferType: ${self.type} is null setting to: ${key}`);
        console.log(self.segmentsToBuffer.entries());
        self.loadingSegment = key;
      }

      if(self.loadingSegment === key) {
        console.log(data);
        if(data !== null) {
          self.sourceBuffer.appendBuffer(new Uint8Array(data));
        } else {
          console.log(`Removing entry ${self.loadingSegment}`)
          self.segmentsToBuffer.delete(self.loadingSegment);
          isReadyForNextSegment();
        }
      }
    }

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
    var bufferUpdated = false;

    do {
      var queue = self.segmentsToBuffer.get(self.loadingSegment);

      if(queue === undefined || queue === null) {
        if(self.segmentsToBuffer.size > 0) {
          self.loadingSegment = self.segmentsToBuffer.keys().next().value;
          continue;
        } else {
          self.loadingSegment = null;
          break;
        }
      }

      if(queue.length > 0) {
        var segment = queue.shift();
        if(segment.data !== null) {
          self.sourceBuffer.appendBuffer(queue.shift());
          bufferUpdated = true;
        } else {
          console.log(`Removing entry ${self.loadingSegment}`)
          self.segmentsToBuffer.delete(self.loadingSegment);
        }
      } else {
        break;
      }
    } while(!bufferUpdated);
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
