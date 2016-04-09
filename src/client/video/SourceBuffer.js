var log               = require('loglevel');
var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../socket/ClientRequestFactory.js');

function SourceBuffer(enum_type, clientVideo){
  var self = Object();

  self.type = enum_type;
  self.hasInit = false;
  self.queue = [];
  self.sourceBuffer = null;

  log.setDefaultLevel(0);
  log.info('SourceBuffer.initialize');

  clientVideo.on('get-init', function(){
    requestVideoData(clientVideo.getActiveMetaData().getInit(self.type));
  });

  clientVideo.on('get-next', function(typeId) {
    if(typeId == self.type) {
      console.log("get-next " + typeId);
      requestVideoData(clientVideo.getActiveMetaData().getNextSegment(self.type));
    }
  });

  clientVideo.on('get-segment', function(typeId, timestamp) {
    if(typeId == self.type) {
      console.log("get-segment " + self.type);
      requestVideoData(clientVideo.getActiveMetaData().getSegment(self.type, timestamp, 0));
    }
  });

  var requestVideoData = function(requestDetails) {
    log.info('SourceBuffer.requestVideoData');
    ClientSocket.sendRequest("get-segment",
      RequestFactory.buildVideoSegmentRequest(self.type, requestDetails[0], requestDetails[1]));
  };

  self.bufferSegment = function(data) {
    if (self.sourceBuffer.updating || clientVideo.mediaSource.readyState != "open" || self.queue.length > 0) {
      self.queue.push(new Uint8Array(data));
    } else if(!self.sourceBuffer.updating) {
      self.sourceBuffer.appendBuffer(new Uint8Array(data));
    }

    if(!self.hasInitSeg) {
      console.log("Init segment has been received.");
      self.hasInitSeg = true;

      requestVideoData(clientVideo.getActiveMetaData().getSegment(self.type, 0, 1));
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

  return self;
}

SourceBuffer.Enum = {"VIDEO" : 0, "AUDIO" : 1};

module.exports = SourceBuffer;
