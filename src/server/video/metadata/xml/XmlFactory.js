function XmlFactory() {

}

XmlFactory.prototype.buildSegmentURL = function(mediaRange, timeCode) {
  return `<SegmentURL mediaRange="${mediaRange[0]}-${mediaRange[1]}" timeCode="${timeCode}"/>`;
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
