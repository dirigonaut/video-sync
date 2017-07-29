const Promise   = require('bluebird');
const XmlParser = Promise.promisifyAll(require('xml2js').Parser());

var threshold, metaData, activeMeta, parserUtil, log;

function MpdMeta() { }

MpdMeta.prototype.initialize = function() {
  if(typeof MpdMeta.prototype.protoInit === 'undefined') {
    MpdMeta.prototype.protoInit = true;
    var logManager  = this.factory.createClientLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
  }
};

MpdMeta.prototype.setMpd = Promise.coroutine(function* (mpdXML, util) {
  parserUtil = util;
  threshold = 2;

  metaData = yield XmlParser.parseStringAsync(mpdXML);
});

MpdMeta.prototype.selectTrackQuality = function(typeId, index) {
  log.info(`MpdMeta.selectTrackQuality typeId: ${typeId}, index: ${index}`);
  if(activeMeta.get(typeId)) {
    var metaState;

    var timeStep = parserUtil.getTimeStep(metaData, typeId, index);
    metaState = this.factory.createMetaState();
    metaState.setTimeStep(timeStep * 1000);

    metaState.setTrackIndex(index);
    activeMeta.set(typeId, metaState);
  } else {
    activeMeta.get(typeId).setTrackIndex(index);
  }
};

MpdMeta.prototype.getInit = function(typeId) {
  log.debug('MpdMeta.getInit ' + typeId);
  var active = activeMeta.get(typeId);
  var range = parserUtil.getInit(metaData, typeId, active.trackIndex).split("-");
  var segment = [range[0], range[1]];
  return this.addPath(typeId, active.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  log.debug('MpdMeta.getSegment');
  var result;
  var active = activeMeta.get(typeId);
  var segments = parserUtil.getSegmentList(metaData, typeId, active.trackIndex);
  var index = this.getSegmentIndex(typeId, timestamp);

  if(index !== null) {
    if(index < parserUtil.getSegmentsCount(metaData, typeId, active.trackIndex)) {
      var segment = segments[index][0];
      if(segment) {
        var range = segment.split("-");
        segment = [range[0], range[1]];

        active.setSegmentBuffered(index);
        result = this.addPath(typeId, active.trackIndex, segment);
      }
    }
  }

  return result;
};

MpdMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var active = activeMeta.get(typeId);
  var segments = parserUtil.getSegmentList(metaData, typeId, active.trackIndex);
  var index = null;

  timestamp *= 1000;

  for(var i in segments) {
    if(segments[i][1] <= timestamp) {
      index = i;
      if(segments.length - 1 > i) {
        if(segments[parseFloat(i) + 1][1] > timestamp) {
          break;
        }
      }
    }
  }

  return index;
};

MpdMeta.prototype.getSegmentTimeCode = function(typeId, index) {
  var active = activeMeta.get(typeId);
  var segments = parseUtil.getSegmentList(metaData, typeId, active.trackIndex);
  var timeCode;

  if(segments) {
    if(index) {
      if(segments[index]) {
        timeCode = segments[index][1];
      }
    }
  }

  return timeCode;
};

MpdMeta.prototype.updateActiveMeta = function(typeId, segmentIndex) {
  log.info('MpdMeta.updateActiveMeta');
  this.active.get(typeId).bufferIndex = segmentIndex;
};

MpdMeta.prototype.isLastSegment = function(typeId, currentTime) {
  var active = activeMeta.get(typeId);
  return this.getSegmentIndex(typeId, currentTime) < parserUtil.getSegmentsCount(metaData, typeId, active.trackIndex) - 1;
};

MpdMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  var nextSegmentTime;
  var active = activeMeta.get(typeId);
  var index = this.getSegmentIndex(typeId, currentTime);

  while(active.isSegmentBuffered(active.bufferIndex)) {
    if(index + this.threshold > active.bufferIndex) {
      active.bufferIndex++;
    } else {
      break;
    }
  }

  if(!active.isSegmentBuffered(active.bufferIndex)) {
    if(parseFloat(index) + threshold > active.bufferIndex) {
      var step = parseFloat(this.getSegmentTimeCode(typeId, 1)) / 2;
      nextSegmentTime = parseFloat(this.getSegmentTimeCode(typeId, active.bufferIndex)) + parseFloat(step);
      nextSegmentTime = nextSegmentTime / 1000;
    }
  }

  return nextSegmentTime;
};

MpdMeta.prototype.getActiveTrackInfo = function() {
  return activeMeta;
};

MpdMeta.prototype.addPath = function(typeId, trackIndex, cluster) {
  var index = parserUtil.getAdaptionSetIndex(metaData, typeId);
  return [parserUtil.getBaseURL(metaData, index, trackIndex), cluster];
};

MpdMeta.prototype.getMimeType = function(typeId) {
  return parserUtil.getMimeType(metaData, typeId);
};

MpdMeta.prototype.getTracks = function() {
  return parserUtil.getTracks(metaData);
};

MpdMeta.prototype.setThreshold = function(range) {
  threshold = range;
};

MpdMeta.prototype.setForceBuffer = function(typeId, forceBuffer) {
  var active = activeMeta.get(typeId);
  active.setForceBuffer(forceBuffer);
};

MpdMeta.prototype.isForceBuffer = function(typeId) {
  var active = activeMeta.get(typeId);
  return active.isForceBuffer();
};

module.exports = MpdMeta;
