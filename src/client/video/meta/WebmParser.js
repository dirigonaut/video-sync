function WebmParser() {

};

WebmParser.prototype.getBaseURL = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);
  return rep.BaseURL[0];
};

WebmParser.prototype.getTimeStep = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);
  console.log(rep);
  var $ = rep.SegmentList[0].$;
  return $.duration / $.timescale;
};

WebmParser.prototype.getSegmentList = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);
  var segmentURLs = rep.SegmentList[0].SegmentURL;
  var segments = [];

  for(var i in segmentURLs) {
    segments.push(segmentURLs[i].$.mediaRange);
  }

  return segments;
};

WebmParser.prototype.getInit = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);
  return rep.SegmentList[0].Initialization[0].$.range;
};

WebmParser.prototype.getMimeType = function(mpd, adaptId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);

  console.log(adaptIndex);
  var type = mpd.Period[0].AdaptationSet[adaptIndex].$.mimeType;
  var codec = mpd.Period[0].AdaptationSet[adaptIndex].$.codecs;

  return `${type}; codecs="${codec}"`;
};

WebmParser.prototype.getTracks = function(mpd) {
  var representationSets = [];

  var adaptSets = mpd.Period[0].AdaptationSet;
  for(var i in adaptSets) {
    var repSets = adaptSets[i].Representation;

    for(var j in repSets) {
      representationSets.push(this.getTrack(mpd, i, repSets[j].$.id));
    }
  };

  return representationSets;
};

WebmParser.prototype.getTrack = function(mpd, adaptIndex, repId) {
  var track = {};
  track.index = repId;
  track.type = this.getTrackType(mpd, adaptIndex);
  track.url = this.getBaseURL(mpd, adaptIndex, repId);

  return track;
};

WebmParser.prototype.getTrackType = function(mpd, adaptIndex) {
  var type = mpd.Period[0].AdaptationSet[adaptIndex].$.mimeType;
  return type.split('/')[0];
};

module.exports = WebmParser;

var getAdationSetIndex = function(mpd, adaptId) {
  var adapt = mpd.Period[0].AdaptationSet;
  for(var i in adapt) {
    if(adapt[i].$.id == adaptId) {
      return i;
    }
  }
  return null;
};

var getRepresentationSet = function(mpd, adaptIndex, repId) {
  var reps = mpd.Period[0].AdaptationSet[adaptIndex].Representation;
  for(var i in reps) {
    console.log(`id:${repId} == ${reps[i].$.id}`);
    if(reps[i].$.id == repId) {
      return reps[i];
    }
  }
  return null;
};
