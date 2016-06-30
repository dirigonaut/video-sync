var log               = require('loglevel');
var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../utils/RequestFactory.js');

function SourceBuffer(enum_type, video, mediaSource){
  var self = Object();

  self.type = enum_type;
  self.hasInit = false;
  self.queue = [];
  self.sourceBuffer = null;

  log.setDefaultLevel(0);
  log.info('SourceBuffer.initialize');

  video.on('get-init', function(){
    requestVideoData(video.getActiveMetaData().getInit(self.type));
  });

  video.on('get-next', function(typeId, timestamp) {
    if(typeId == self.type) {
      if(!isTimeRangeBuffered(timestamp)) {
        requestVideoData(video.getActiveMetaData().getNextSegment(self.type));
      }
    }
  });

  video.on('get-segment', function(typeId, timestamp) {
    if(typeId == self.type) {
      if(!isTimeRangeBuffered(timestamp)) {
        requestVideoData(video.getActiveMetaData().getSegment(self.type, timestamp));
      }
    }
  });

  self.setSourceBufferCallback = function(spec) {
    return function(e) {
      console.log("SourceBuffer attached to MediaSource.")
      self.sourceBuffer = mediaSource.addSourceBuffer(spec);
      self.sourceBuffer.addEventListener('error',  self.objectState);
      self.sourceBuffer.addEventListener('abort',  self.objectState);
      self.sourceBuffer.addEventListener('update', self.getOnBufferUpdate());
      self.sourceBuffer.addEventListener('sourceend', self.clearEvents());
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
      requestVideoData(video.getActiveMetaData().getSegment(self.type, 0));
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
    log.info("SourceBuffer's objectState");
    console.log(e);
  };

  self.clearEvents = function(e) {
    log.info("SourceBuffer's clearEvents");

    console.log(e);
  };

  var requestVideoData = function(requestDetails) {
    log.info('SourceBuffer.requestVideoData');
    new ClientSocket().sendRequest("get-segment",
      new RequestFactory().buildVideoSegmentRequest(self.type, requestDetails[0], requestDetails[1]), false);
  };

  var isTimeRangeBuffered = function(timestamp) {
    var buffered = false;
    var timeRanges = self.sourceBuffer.buffered;

    for(var i = 0; i < timeRanges.length; ++i) {
      if(timeRanges.start(i) * 1000 > timestamp) {
        break;
      } else if (timeRanges.end(i) * 1000 > timestamp) {
        buffered = true;
        break;
      }
    }

    return buffered;
  }

  return self;
}

SourceBuffer.Enum = {"VIDEO" : 0, "AUDIO" : 1};

module.exports = SourceBuffer;
