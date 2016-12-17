var xml2js = require('xml2js');

var MetaState  = require('./MetaState.js');
var log           = require('loglevel');
var SourceBuffer  = require('../SourceBuffer.js');

function MpdMeta(mpdXML, util) {
  log.info('MpdMeta');
  this.util = util;
  this.active = new Map();
  this.threshold = 1;

  var _this = this;
  var parser = new xml2js.Parser();

  parser.parseString(mpdXML, function (err, result) {
    _this.metaJson = result.MPD;

    _this.selectTrackQuality(SourceBuffer.Enum.VIDEO, 0);
    _this.selectTrackQuality(SourceBuffer.Enum.AUDIO, 1);
  });
}

MpdMeta.prototype.selectTrackQuality = function(typeId, index) {
  log.info(`MpdMeta.selectTrackQuality typeId: ${typeId}, index: ${index}`);
  var timeStep = this.util.getTimeStep(this.metaJson, index)

  var metaState = new MetaState(index, timeStep);
  this.active.set(typeId, metaState);
};

MpdMeta.prototype.getInit = function(typeId) {
  console.log('MpdMeta.getInit ' + typeId);
  var activeMeta = this.active.get(typeId);
  var range = this.util.getInit(this.metaJson, activeMeta.trackIndex).split("-");
  var segment = [range[0], range[1]];
  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getNextSegment = function(typeId) {
  console.log('MpdMeta.getNextSegment');
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, activeMeta.trackIndex);

  var range = segments[activeMeta.next].split("-");
  var segment = [range[0], range[1]];

  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  console.log('MpdMeta.getSegment');
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, activeMeta.trackIndex);

  var index = this.getSegmentIndex(typeId, timestamp);
  var range = segments[index].split("-");
  var segment = [range[0], range[1]];

  activeMeta.setSegmentBuffered(index);
  console.log(activeMeta);
  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var activeMeta = this.active.get(typeId);
  var index = Math.trunc(timestamp / activeMeta.timeStep);
  return index;
};

MpdMeta.prototype.updateActiveMeta = function(typeId, segmentIndex) {
  log.info('MpdMeta.updateActiveMeta');
  var activeMeta = this.active.get(typeId);

  if(segmentIndex != activeMeta.current) {
    activeMeta.current = parseInt(segmentIndex);
    activeMeta.next    = activeMeta.current + 1;
  }
};

MpdMeta.prototype.isLastSegment = function(typeId) {
  var activeMeta = this.active.get(typeId);
  return activeMeta.current < this.util.getSegmentList(this.metaJson, activeMeta.trackIndex).length;
};

MpdMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  var isReady = false;
  var activeMeta = this.active.get(typeId);
  var index = this.getSegmentIndex(typeId, currentTime);
  var threshold = this.threshold * activeMeta.timeStep;

  console.log(`--- TypeId: ${typeId} Time: ${currentTime} Current: ${activeMeta.current} isBuffered: ${activeMeta.isSegmentBuffered(activeMeta.next)}`)
  if(index != null) {
    if(activeMeta.current * activeMeta.timeStep < currentTime + threshold && !activeMeta.isSegmentBuffered(activeMeta.next)) {
      console.log(activeMeta);
      console.log(`triggered ${typeId}`);
      activeMeta.setSegmentBuffered(activeMeta.next);
      isReady = true;
    }

    if((activeMeta.current + 1) * activeMeta.timeStep <= currentTime) {
      console.log(`Updating meta for type ${typeId} for index ${activeMeta.current + 1}`);
      this.updateActiveMeta(typeId, activeMeta.current + 1);
    }
  }

  return isReady;
};

MpdMeta.prototype.getActiveMeta = function(typeId) {
  return this.active.get(typeId);
};

MpdMeta.prototype._addPath = function(trackIndex, cluster) {
  console.log([this.util.getBaseURL(this.metaJson, trackIndex), cluster])
  return [this.util.getBaseURL(this.metaJson, trackIndex), cluster];
};

MpdMeta.prototype.getMimeType = function(typeId) {
  return this.util.getMimeType(this.metaJson, this.active.get(typeId).trackIndex);
};

MpdMeta.prototype.getTrackTimeStep = function(typeId) {
  return this.util.getTimeStep(this.metaJson, this.active.get(typeId).trackIndex);
};

MpdMeta.prototype.getTracks = function() {
  return this.util.getTracks(this.metaJson);
};

MpdMeta.prototype.setThreshold = function(threshold) {
  return this.threshold = threshold;
};

module.exports = MpdMeta;
