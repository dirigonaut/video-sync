var xml2js = require('xml2js');

var log           = require('loglevel');
var SourceBuffer  = require('../SourceBuffer.js');

function MpdMeta(mpdXML) {
  log.info('MpdMeta');
  var _this = this;
  var parser = new xml2js.Parser();

  parser.parseString(mpdXML, function (err, result) {
    _this.metaJson = result.MPD;
    console.log(_this.metaJson);

    _this.active   = new Map();

    var activeVideo = ActiveMeta();
    activeVideo.trackIndex = 0;
    activeVideo.timeStep = getTimeStep(_this.metaJson, activeVideo.trackIndex);
    activeVideo.threshold = activeVideo.timeStep / 2;
    _this.active.set(SourceBuffer.Enum.VIDEO, activeVideo);

    var activeAudio = ActiveMeta();
    activeAudio.trackIndex = 1;
    activeAudio.timeStep = getTimeStep(_this.metaJson, activeAudio.trackIndex);
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
  var range = getInit(this.metaJson, activeMeta.trackIndex).split("-");
  var segment = [range[0], range[1]];
  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getNextSegment = function(typeId) {
  log.info('MpdMeta.getNextSegment');
  var activeMeta = this.active.get(typeId);
  var segments = getSegmentList(this.metaJson, activeMeta.trackIndex).SegmentURL;

  var range = segments[activeMeta.next.index].$.mediaRange.split("-");
  var segment = [range[0], range[1]];

  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegment = function(typeId, timestamp) {
  log.info('MpdMeta.getSegment');
  var activeMeta = this.active.get(typeId);
  var segments = getSegmentList(this.metaJson, activeMeta.trackIndex).SegmentURL;

  var index = this.getSegmentIndex(typeId, timestamp);
  var range = segments[index].$.mediaRange.split("-");
  var segment = [range[0], range[1]];

  console.log(`range: ${range}`);
  return this._addPath(activeMeta.trackIndex, segment);
};

MpdMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var activeMeta = this.active.get(typeId);
  return Math.trunc(timestamp / activeMeta.timeStep);
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
  return activeMeta.current.index < getSegmentList(this.metaJson, activeMeta.trackIndex).SegmentURL.length;
};

MpdMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
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
  console.log([getBaseURL(this.metaJson, trackIndex), cluster])
  return [getBaseURL(this.metaJson, trackIndex), cluster];
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

var getBaseURL = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].BaseURL[0];
};

var getTimeStep = function(mpd, trackIndex) {
  var $ = mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].$;
  return $.duration / $.timescale;
};

var getSegmentList = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0];
};

var getInit = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].Initialization[0].$.range;
};

var getMimeType = function(mpd, typeId) {
  var type = mpd.Period[0].AdaptationSet[trackIndex].$.mimType;
  var codec = mpd.Period[0].AdaptationSet[trackIndex].$.codec;

  return `${type}; codecs="${codec}"`;
};
