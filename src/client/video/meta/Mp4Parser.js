function Mp4Parser() {

};

Mp4Parser.prototype.getBaseURL = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].BaseURL[0];
};

Mp4Parser.prototype.getTimeStep = function(mpd, trackIndex) {
  var $ = mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].$;
  return $.duration / $.timescale;
};

Mp4Parser.prototype.getSegmentList = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0];
};

Mp4Parser.prototype.getInit = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].Initialization[0].$.range;
};

Mp4Parser.prototype.getMimeType = function(mpd, typeId) {
  var type = mpd.Period[0].AdaptationSet[trackIndex].$.mimType;
  var codec = mpd.Period[0].AdaptationSet[trackIndex].$.codec;

  return `${type}; codecs="${codec}"`;
};

module.exports = Mp4Parser;
