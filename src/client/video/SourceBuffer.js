var ClientLog         = require('../log/ClientLogManager');
var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../utils/RequestFactory.js');

var log = ClientLog.getLog();

function SourceBuffer(enum_type, video, metaManager, mediaSource){
  var self = {};

  self.type = enum_type;
  self.sourceBuffer = null;
  self.hasInitSeg = false;

  self.segmentsToBuffer = new Map();
  self.segmentsInfo = new Map();
  self.loadingSegment = null;
  self.index = 0;

  log.info(`SourceBuffer.initialize type: ${self.type}`);

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
          var key = `${segmentInfo[0]}-${segmentInfo[1][0]}-${segmentInfo[1][1]}-${self.type}`;
          if(self.segmentsInfo.get(key) === null || self.segmentsInfo.get(key) === undefined) {
            requestVideoData(segmentInfo);
            self.segmentsInfo.set(key, segmentInfo);
          }
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
    };
  };

  self.bufferSegment = function(key, index, data) {
    var mapQueue = self.segmentsToBuffer.get(key);
    var chunk = data !== null ? new Uint8Array(data) : null;

    if(mapQueue !== undefined && mapQueue !== null) {
      log.debug(`Queue found for key: ${key}`);
      mapQueue.set(index, chunk);
    } else {
      log.debug(`Creating queue for key: ${key}`);
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
      log.debug("getOnBufferUpdate");
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
          isMissingTimeRange();

          if(self.segmentsToBuffer.size > 0) {
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

  self.objectState = function(e, p) {
    log.error("SourceBuffer's objectState", e);
  };

  self.clearEvents = function(e) {
    log.info("SourceBuffer's clearEvents");
    video.removeListener('get-init', getInit);
    video.removeListener('get-segment', getSegment);

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

    for(var i = 0; i < timeRanges.length; ++i) {
      console.log(`${self.type}:${timeRanges.start(i)}-${timeRanges.end(i)}`);
    }
    
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

  var isMissingTimeRange = function() {
    log.info('isMissingTimeRange');

    var currentTime = video.getVideoElement().currentTime;
    log.info(`Current time: ${currentTime}`);

    if(isTimeRangeBuffered(currentTime)) {
      log.info(`${currentTime} is buffered for sourcebuffer type ${self.type}`);
    } else {
      var bufferedRange = getClosestTimeRange(currentTime);
      var segmentInfo = self.segmentsInfo.get(self.loadingSegment);

      if(bufferedRange !== null && segmentInfo !== null && segmentInfo !== undefined) {
        var segmentRange = [segmentInfo.index * segmentInfo.timeStep,
          ((segmentInfo.index + 1) * segmentInfo.timeStep) - 1];

        log.info(`Closest range is: ${bufferedRange[0]}-${bufferedRange[1]}`);
        log.info(`SegmentRange range is: ${segmentRange[0]}-${segmentRange[1]}`);
        if(bufferedRange[0] > currentTime) {
          var difference = Math.abs(bufferedRange[0] - segmentRange[0]);
          var offset = Math.trunc(difference / segmentInfo.timeStep);

          console.log(`${self.type} scenario 1 ${difference} ${offset}`);
          console.log(currentTime - Math.abs((offset * segmentInfo.timeStep) - (segmentInfo.timeStep / 2)));
          getSegment(self.type, currentTime - Math.abs((offset * segmentInfo.timeStep) - (segmentInfo.timeStep / 2)));
        } else if(bufferedRange[1] < currentTime) {
          var difference = Math.abs(bufferedRange[1] - segmentRange[1]);
          var offset = Math.trunc(difference / segmentInfo.timeStep);

          console.log(`${self.type} scenario 2 ${difference} ${offset}`);
          console.log(currentTime + Math.abs((offset * segmentInfo.timeStep) - (segmentInfo.timeStep / 2)));
          getSegment(self.type, currentTime + Math.abs((offset * segmentInfo.timeStep) - (segmentInfo.timeStep / 2)));
        }
      }
    }
  };

  var getClosestTimeRange = function(currentTime) {
    log.info('getClosestTimeRange');
    var timeRanges = self.sourceBuffer.buffered;
    var closestRange = null;

    if(timeRanges !== null && timeRanges !== undefined && timeRanges.length > 0) {
      var closestStart = null;
      var closestEnd = null;

      for(var i = 0; i < timeRanges.length; ++i) {
        if(timeRanges.start(i) > currentTime) {
          if(Math.abs(timeRanges.start(i) - currentTime) < Math.abs(timeRanges.start(closestStart) - currentTime)) {
            closestStart = i;
          }
        }
        if (timeRanges.end(i) < currentTime) {
          if(Math.abs(timeRanges.end(i) - currentTime) < Math.abs(timeRanges.end(closestEnd) - currentTime)) {
            closestEnd = i;
          }
        }
      }

      if(closestStart !== null && closestEnd !== null) {
        if(Math.abs(timeRanges.start(closestStart) - currentTime) < Math.abs(timeRanges.end(closestEnd) - currentTime)) {
          closestRange = [timeRanges.start(closestStart), timeRanges.end(closestStart)];
        } else {
          closestRange = [timeRanges.start(closestEnd), timeRanges.end(closestEnd)];
        }
      } else {
        if(closestEnd !== null) {
          closestRange = [timeRanges.start(closestEnd), timeRanges.end(closestEnd)];
        } else {
          closestRange = [timeRanges.start(closestStart), timeRanges.end(closestStart)];
        }
      }
    }

    return closestRange;
  };

  return self;
}

SourceBuffer.Enum = { "VIDEO" : 0, "AUDIO" : 1 };

module.exports = SourceBuffer;
