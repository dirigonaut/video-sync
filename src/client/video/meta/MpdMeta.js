const Promise   = require('bluebird');
const XmlParser = Promise.promisifyAll(require('xml2js').Parser());

var log;

function MpdMeta() { }

MpdMeta.prototype.initialize = function() {
  if(typeof MpdMeta.prototype.protoInit === 'undefined') {
    MpdMeta.prototype.protoInit = true;
    var logManager  = this.factory.createClientLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);
  }

  this.threshold       = 2;
  this.metaData        = undefined;
  this.activeMeta      = new Map();
};

MpdMeta.prototype.setParser = function(util) {
  this.parserUtil = util;
};

MpdMeta.prototype.setMpd = Promise.coroutine(function* (mpdXML) {
  this.metaData = yield XmlParser.parseStringAsync(mpdXML);
  this.metaData = this.metaData.MPD;
});

MpdMeta.prototype.setTrackQuality = function(typeId, index) {
  log.info(`MpdMeta.setTrackQuality typeId: ${typeId}, index: ${index}`);
  if(!this.activeMeta.get(typeId)) {
    var metaState;

    var timeStep = this.parserUtil.getTimeStep(this.metaData, typeId, index);
    metaState = this.factory.createMetaState();
    metaState.setTimeStep(timeStep * 1000);

    metaState.setTrackIndex(index);
    this.activeMeta.set(typeId, metaState);
  } else {
    this.activeMeta.get(typeId).setTrackIndex(index);
  }
};

MpdMeta.prototype.getInit = function(typeId) {
  log.debug('MpdMeta.getInit ' + typeId);
  var active = this.activeMeta.get(typeId);
  var range = this.parserUtil.getInit(this.metaData, typeId, active.trackIndex).split("-");
  var segment = [range[0], range[1]];
  return this.addPath(typeId, active.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  log.debug(`MpdMeta.getSegment ${typeId}, ${timestamp}`);
  var result;
  var active = this.activeMeta.get(typeId);
  var segments = this.parserUtil.getSegmentList(this.metaData, typeId, active.trackIndex);
  var index = this.getSegmentIndex(typeId, timestamp);

  if(index) {
    if(index < this.parserUtil.getSegmentsCount(this.metaData, typeId, active.trackIndex)) {
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
  var active = this.activeMeta.get(typeId);
  var segments = this.parserUtil.getSegmentList(this.metaData, typeId, active.trackIndex);
  var index = null;

  timestamp *= 1000;

  for(var i in segments) {
    var segment = Math.trunc(segments[i][1] / 1000) !== 0 ? segments[i][1] : 0
    if(segment <= timestamp) {
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
  var active = this.activeMeta.get(typeId);
  var segments = this.parserUtil.getSegmentList(this.metaData, typeId, active.trackIndex);
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
  log.info('MpdMeta.updateActiveMeta', typeId);
  this.activeMeta.get(typeId).bufferIndex = segmentIndex;
};

MpdMeta.prototype.isLastSegment = function(typeId, currentTime) {
  var active = this.activeMeta.get(typeId);
  return this.getSegmentIndex(typeId, currentTime) < this.parserUtil.getSegmentsCount(this.metaData, typeId, active.trackIndex) - 1;
};

MpdMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  var nextSegmentTime;
  var active = this.activeMeta.get(typeId);
  var index = this.getSegmentIndex(typeId, currentTime);

  while(active.isSegmentBuffered(active.bufferIndex)) {
    if(index + this.threshold > active.bufferIndex) {
      active.bufferIndex++;
    } else {
      break;
    }
  }

  if(!active.isSegmentBuffered(active.bufferIndex)) {
    if(parseFloat(index) + this.threshold > active.bufferIndex) {
      var step = parseFloat(this.getSegmentTimeCode(typeId, 1)) / 2;
      nextSegmentTime = parseFloat(this.getSegmentTimeCode(typeId, active.bufferIndex)) + parseFloat(step);
      nextSegmentTime = nextSegmentTime / 1000;
    }
  }

  return nextSegmentTime;
};

MpdMeta.prototype.getActiveTrackInfo = function() {
  return this.activeMeta;
};

MpdMeta.prototype.addPath = function(typeId, trackIndex, cluster) {
  var index = this.parserUtil.getAdaptionSetIndex(this.metaData, typeId);
  return [this.parserUtil.getBaseURL(this.metaData, index, trackIndex), cluster];
};

MpdMeta.prototype.getMimeType = function(typeId) {
  return this.parserUtil.getMimeType(this.metaData, typeId);
};

MpdMeta.prototype.getTracks = function() {
  return this.parserUtil.getTracks(this.metaData);
};

MpdMeta.prototype.setThreshold = function(range) {
  this.threshold = range;
};

MpdMeta.prototype.setForceBuffer = function(typeId, forceBuffer) {
  this.activeMeta.get(typeId).setForceBuffer(forceBuffer);
};

MpdMeta.prototype.isForceBuffer = function(typeId) {
  return this.activeMeta.get(typeId).isForceBuffer();
};

module.exports = MpdMeta;
