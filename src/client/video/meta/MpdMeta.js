var xml2js = require('xml2js');

var MetaState  = require('./MetaState');
var ClientLog = require('../../log/ClientLogManager');
var SourceBuffer  = require('../SourceBuffer');

//var log = ClientLog.getLog();

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
  log.debug('MpdMeta.getInit ' + typeId);
  var activeMeta = this.active.get(typeId);
  var range = this.util.getInit(this.metaJson, typeId, activeMeta.trackIndex).split("-");
  var segment = [range[0], range[1]];
  return this._addPath(typeId, activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  log.debug('MpdMeta.getSegment');
  var result = null;
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, typeId, activeMeta.trackIndex);
  var index = this.getSegmentIndex(typeId, timestamp);

  if(index !== null) {
    if(index < this.util.getSegmentsCount(this.metaJson, typeId, activeMeta.trackIndex)) {
      var segment = segments[index][0];
      if(segment !== null && segment !== undefined) {
        var range = segment.split("-");
        segment = [range[0], range[1]];

        activeMeta.setSegmentBuffered(index);
        result = this._addPath(typeId, activeMeta.trackIndex, segment);
      }
    }
  }

  return result;
};

MpdMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, typeId, activeMeta.trackIndex);
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
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, typeId, activeMeta.trackIndex);
  var timeCode = null;

  if(segments !== null && segments !== undefined) {
    if(index !== null && index !== undefined) {
      if(segments[index] !== null && segments[index] !== undefined) {
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
    if(parseFloat(index) + this.threshold > activeMeta.bufferIndex) {
      var step = parseFloat(this.getSegmentTimeCode(typeId, 1)) / 2;
      nextSegmentTime = parseFloat(this.getSegmentTimeCode(typeId, activeMeta.bufferIndex)) + parseFloat(step);
      nextSegmentTime = nextSegmentTime / 1000;
    }
  }

  return nextSegmentTime;
};

MpdMeta.prototype.getActiveTrackInfo = function() {
  return this.active;
};

MpdMeta.prototype._addPath = function(typeId, trackIndex, cluster) {
  var index = this.util.getAdaptionSetIndex(this.metaJson, typeId);
  return [this.util.getBaseURL(this.metaJson, index, trackIndex), cluster];
};

MpdMeta.prototype.getMimeType = function(typeId) {
  return this.util.getMimeType(this.metaJson, typeId);
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
