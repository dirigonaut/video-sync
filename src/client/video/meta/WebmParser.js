function WebmParser() {

};

WebmParser.prototype.getBaseURL = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].BaseURL[0];
};

WebmParser.prototype.getTimeStep = function(mpd, trackIndex) {
  var $ = mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].$;
  return $.duration / $.timescale;
};

WebmParser.prototype.getSegmentList = function(mpd, trackIndex) {
  var segmentURLs = mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].SegmentURL;
  var segments = [];

  for(var i in segmentURLs) {
    segments.push(segmentURLs[i].$.mediaRange);
  }

  return segments;
};

WebmParser.prototype.getInit = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].Initialization[0].$.range;
};

WebmParser.prototype.getMimeType = function(mpd, typeId) {
  var type = mpd.Period[0].AdaptationSet[typeId].$.mimeType;
  var codec = mpd.Period[0].AdaptationSet[typeId].$.codecs;

  return `${type}; codecs="${codec}"`;
};

WebmParser.prototype.getTracks = function(mpd) {
  var adaptionSets = [];

  var set = mpd.Period[0].AdaptationSet[trackIndex];
  for(var i in set) {
    adaptionSets.push(this.getTrack(mpd, i));
  };

  return adaptionSets;
};

WebmParser.prototype.getTrack = function(mpd, trackIndex) {
  var track = {};
  track.index = trackIndex;
  track.type = this.getTrackType(mpd, trackIndex);
  track.url = this.getBaseURL(mpd, trackIndex);

  return track;
};

WebmParser.prototype.getTrackType = function(mpd, trackIndex) {
  var type = mpd.Period[0].AdaptationSet[typeId].Representation[0].$.mimeType;
  return type.split('/')[0];
};

module.exports = WebmParser;
