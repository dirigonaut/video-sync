var log               = require('loglevel');
var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../utils/RequestFactory.js');

function SourceBuffer(enum_type, video, metaManager, mediaSource){
  var self = {};

  self.type = enum_type;
  self.hasInit = false;
  self.queue = [];
  self.sourceBuffer = null;

  log.setDefaultLevel(0);
  log.info('SourceBuffer.initialize');

  var getInit = function(){
    requestVideoData(metaManager.getActiveMetaData().getInit(self.type));
  };

  video.on('get-init', getInit);

  var getSegment = function(typeId, timestamp) {
    if(typeId == self.type) {
      if(!isTimeRangeBuffered(timestamp)) {
        console.log(metaManager.getActiveMetaData());
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

  self.bufferSegment = function(data) {
    if (self.sourceBuffer.updating || mediaSource.readyState != "open" || self.queue.length > 0) {
      self.queue.push(new Uint8Array(data));
    } else if(!self.sourceBuffer.updating) {
      self.sourceBuffer.appendBuffer(new Uint8Array(data));
    }

    if(!self.hasInitSeg) {
      console.log("Init segment has been received.");
      self.hasInitSeg = true;
      requestVideoData(metaManager.getActiveMetaData().getSegment(self.type, 0));
    }
  };

  self.getOnBufferUpdate = function() {
    return function(e) {
      if(!self.sourceBuffer.updating){
        if (self.queue.length > 0) {
          self.sourceBuffer.appendBuffer(self.queue.shift());
        }
      }
    }
  };

  self.objectState = function(e) {
    console.log("SourceBuffer's objectState");
    console.log(e);
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
    log.info('SourceBuffer.requestVideoData');
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
