function XmlFactory() {

}

XmlFactory.prototype.buildSegmentURL = function(mediaRange, indexRange) {
  return `<SegmentURL mediaRange="${mediaRange[0]}-${mediaRange[1]}" indexRange="${indexRange[0]}-${indexRange[1]}"/>`;
};


XmlFactory.prototype.buildInitialization = function(range) {
  return `<Initialization range="${range[0]}-${range[1]}"/>`;
};

XmlFactory.prototype.buildSegmentList = function(timescale, duration) {
  return `<SegmentList timescale="${timescale}" duration="${duration}">`;
};

XmlFactory.prototype.buildSegmentListEnd = function() {
  return '</SegmentList>';
};

module.exports = XmlFactory;
