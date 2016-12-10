var xml2js = require('xml2js');

var log           = require('loglevel');
var SourceBuffer  = require('../SourceBuffer.js');

function MpdMeta(mpdXML, util) {
  log.info('MpdMeta');
  this.util = util;

  var _this = this;
  var parser = new xml2js.Parser();

  parser.parseString(mpdXML, function (err, result) {
    _this.metaJson = result.MPD;
    console.log(_this.metaJson);

    _this.active   = new Map();

    var activeVideo = ActiveMeta();
    activeVideo.trackIndex = 0;
    activeVideo.timeStep = _this.util.getTimeStep(_this.metaJson, activeVideo.trackIndex);
    activeVideo.threshold = activeVideo.timeStep / 2;
    _this.active.set(SourceBuffer.Enum.VIDEO, activeVideo);

    var activeAudio = ActiveMeta();
    activeAudio.trackIndex = 1;
    activeAudio.timeStep = _this.util.getTimeStep(_this.metaJson, activeAudio.trackIndex);
    activeAudio.threshold = activeAudio.timeStep / 2;
    _this.active.set(SourceBuffer.Enum.AUDIO, activeAudio);

    console.log(_this.active);
  });
}

MpdMeta.prototype.selectVideoQuality = function(index) {
  log.info('MpdMeta.selectVideoQuality');
  this.active.get(SourceBuffer.Enum.VIDEO).trackIndex = index;
};

MpdMeta.prototype.selectAudioQuality = function(index) {
  log.info('MpdMeta.selectAudioQuality');
  this.active.get(SourceBuffer.Enum.AUDIO).trackIndex = index;
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
  var segments = this.util.getSegmentList(this.metaJson, activeMeta.trackIndex).SegmentURL;

  var range = segments[activeMeta.next.index].$.mediaRange.split("-");
  var segment = [range[0], range[1]];

  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  console.log('MpdMeta.getSegment');
  var activeMeta = this.active.get(typeId);
  var segments = this.util.getSegmentList(this.metaJson, activeMeta.trackIndex).SegmentURL;

  var index = this.getSegmentIndex(typeId, timestamp);
  var range = segments[index].$.mediaRange.split("-");
  var segment = [range[0], range[1]];

  console.log(`range: ${range}`);
  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var activeMeta = this.active.get(typeId);
  var index = Math.trunc(timestamp / activeMeta.timeStep);
  console.log(`Timestamp: ${timestamp}, Timestep: ${activeMeta.timeStep}, Index: ${index}`);
  return index;
};

MpdMeta.prototype.updateActiveMeta = function(typeId, segmentIndex) {
  log.info('MpdMeta.updateActiveMeta');
  var activeMeta = this.active.get(typeId);

  if(segmentIndex != activeMeta.current.index) {
    activeMeta.current.index = parseInt(segmentIndex);
    activeMeta.next.index    = activeMeta.current.index + 1;
    activeMeta.next.buffered = false;
  }
};

MpdMeta.prototype.isLastSegment = function(typeId) {
  var activeMeta = this.active.get(typeId);
  return activeMeta.current.index < this.util.getSegmentList(this.metaJson, activeMeta.trackIndex).SegmentURL.length;
};

MpdMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  console.log('MpdMeta.isReadyForNextSegment');
  var activeMeta = this.active.get(typeId);
  var index = this.getSegmentIndex(typeId, currentTime);

  if(index != null) {
    var isReady = false;

    if((index * activeMeta.timeStep < currentTime) && !activeMeta.next.buffered) {
      isReady = true;
      activeMeta.next.buffered = true;
    }

    if(index == activeMeta.next.index) {
      activeMeta.current.index = activeMeta.next.index;
      activeMeta.next.index    = activeMeta.current.index + 1;
      activeMeta.next.buffered = false;
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

module.exports = MpdMeta;

function ActiveMeta() {
  var activeMeta            = {};

  activeMeta.trackIndex     = null;
  activeMeta.timeStep       = 0;
  activeMeta.threshold      = activeMeta.timeStep / 2;

  activeMeta.current        = {};
  activeMeta.current.index  = 0;

  activeMeta.next           = {};
  activeMeta.next.index     = activeMeta.current.index + 1;
  activeMeta.next.buffered  = false;

  return activeMeta;
};
