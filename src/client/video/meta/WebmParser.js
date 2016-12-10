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
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0];
};

WebmParser.prototype.getInit = function(mpd, trackIndex) {
  return mpd.Period[0].AdaptationSet[trackIndex].Representation[0].SegmentList[0].Initialization[0].$.range;
};

WebmParser.prototype.getMimeType = function(mpd, typeId) {
  var type = mpd.Period[0].AdaptationSet[typeId].$.mimeType;
  var codec = mpd.Period[0].AdaptationSet[typeId].$.codecs;

  return `${type}; codecs="${codec}"`;
};

module.exports = WebmParser;
