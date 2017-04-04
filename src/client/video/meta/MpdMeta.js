var xml2js = require('xml2js');

var MetaState  = require('./MetaState');
var ClientLog = require('../../log/ClientLogManager');
var SourceBuffer  = require('../SourceBuffer');

var log = ClientLog.getLog();

function MpdMeta(mpdXML, util) {
  log.info('MpdMeta');
  this.util = util;
  this.active = new Map();
  this.threshold = 2;

  var _this = this;
  var parser = new xml2js.Parser();

  parser.parseString(mpdXML, function (err, result) {
    _this.metaJson = result.MPD;
  });
}

MpdMeta.prototype.selectTrackQuality = function(typeId, index) {
  log.info(`MpdMeta.selectTrackQuality typeId: ${typeId}, index: ${index}`);

  if(this.active.get(typeId) === null || this.active.get(typeId) === undefined) {
    var metaState = null;

    var timeStep = this.util.getTimeStep(this.metaJson, typeId, index);
    metaState = new MetaState(timeStep * 1000);

    metaState.setTrackIndex(index);
    this.active.set(typeId, metaState);
  } else {
    this.active.get(typeId).setTrackIndex(index);
  }
};

MpdMeta.prototype.getInit = function(typeId) {
  console.log('MpdMeta.getInit ' + typeId);
  var activeMeta = this.active.get(typeId);
  var range = this.util.getInit(this.metaJson, typeId, activeMeta.trackIndex).split("-");
  var segment = [range[0], range[1]];
  return this._addPath(typeId, activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  console.log('MpdMeta.getSegment');
  var result = null;
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, typeId, activeMeta.trackIndex);
  var index = this.getSegmentIndex(typeId, timestamp);

  if(index !== null) {
    if(index < this.util.getSegmentsCount(this.metaJson, typeId, activeMeta.trackIndex)) {
      var segment = segments[index];
      if(segment !== null && segment !== undefined) {
        var range = segment.split("-");
        segment = [range[0], range[1]];

        activeMeta.setSegmentBuffered(index);
        result = this._addPath(typeId, activeMeta.trackIndex, segment);
        result.index = index;
        result.timeStep = activeMeta.timeStep;
      }
    }
  }

  return result;
};

MpdMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var timeStep = this.active.get(typeId).timeStep;
  var divisor = Math.trunc(timestamp / timeStep);
  var index = null;

  if(divisor * timeStep <= timestamp && timestamp < (divisor + 1) * timeStep) {
    console.log(`${typeId} scenario 1`);
    index = divisor;
  } else if(divisor + 1 * timeStep <= timestamp && timestamp < (divisor + 2) * timeStep) {
    console.log(`${typeId} scenario 2`);
    index = divisor + 1;
  }

  console.log(`${typeId}-${index} : ${divisor} * ${timeStep} = ${divisor * timeStep} <= ${timestamp} && ${timestamp} < ${divisor + 1} * ${timeStep} = ${(divisor + 1) * timeStep}`);

  return index;
};

MpdMeta.prototype.updateActiveMeta = function(typeId, segmentIndex) {
  log.info('MpdMeta.updateActiveMeta');
  this.active.get(typeId).bufferIndex = segmentIndex;
};

MpdMeta.prototype.isLastSegment = function(typeId, currentTime) {
  var activeMeta = this.active.get(typeId);
  return this.getSegmentIndex(typeId, currentTime) < this.util.getSegmentsCount(this.metaJson, typeId, activeMeta.trackIndex) - 1;
};

MpdMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  var nextSegmentTime = null;
  var activeMeta = this.active.get(typeId);
  var index = this.getSegmentIndex(typeId, currentTime);

  while(activeMeta.isSegmentBuffered(activeMeta.bufferIndex)) {
    if(index + this.threshold > activeMeta.bufferIndex) {
      activeMeta.bufferIndex++;
    } else {
      break;
    }
  }

  if(!activeMeta.isSegmentBuffered(activeMeta.bufferIndex)) {
    //Adding the remainder is to negate floating point arithmatic issues
    var remainder = currentTime % activeMeta.timeStep;
    nextSegmentTime = ((activeMeta.bufferIndex * activeMeta.timeStep) + remainder).toFixed(1);
  }

  return nextSegmentTime;
};

MpdMeta.prototype.getActiveTrackInfo = function() {
  return this.active;
};

MpdMeta.prototype._addPath = function(typeId, trackIndex, cluster) {
  console.log([this.util.getBaseURL(this.metaJson, typeId, trackIndex), cluster])
  return [this.util.getBaseURL(this.metaJson, typeId, trackIndex), cluster];
};

MpdMeta.prototype.getMimeType = function(typeId) {
  return this.util.getMimeType(this.metaJson, typeId);
};

MpdMeta.prototype.getTrackTimeStep = function(typeId) {
  return this.util.getTimeStep(this.metaJson, typeId, this.active.get(typeId).trackIndex);
};

MpdMeta.prototype.getTracks = function() {
  return this.util.getTracks(this.metaJson);
};

MpdMeta.prototype.setThreshold = function(threshold) {
  this.threshold = threshold;
};

MpdMeta.prototype.setForceBuffer = function(typeId, forceBuffer) {
  var activeMeta = this.active.get(typeId);
  activeMeta.setForceBuffer(forceBuffer);
};

MpdMeta.prototype.isForceBuffer = function(typeId) {
  var activeMeta = this.active.get(typeId);
  return activeMeta.isForceBuffer();
};

module.exports = MpdMeta;
