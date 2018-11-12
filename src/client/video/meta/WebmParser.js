function WebmParser() { }

WebmParser.prototype.getBaseURL = function(mpd, adaptIndex, repId) {
  var rep = getRepresentationSet(mpd, adaptIndex, repId);
  var baseUrl;

  if(rep) {
    baseUrl = rep.BaseURL[0];
  }

  return baseUrl;
};

WebmParser.prototype.getTimeStep = function(mpd, adaptId, repId) {
  var adaptIndex = getAdaptionSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var timeStep;
  if(rep) {
    if(rep.SegmentList) {
      var $ = rep.SegmentList[0].$;
      timeStep = $.duration / $.timescale;
    }
  }

  return timeStep;
};

WebmParser.prototype.getSegmentList = function(mpd, adaptId, repId) {
  var adaptIndex = getAdaptionSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var segments = [];
  if(rep) {
    if(rep.SegmentList) {
      var segmentURLs = rep.SegmentList[0].SegmentURL;

      for(var i in segmentURLs) {
        segments.push([segmentURLs[i].$.mediaRange, segmentURLs[i].$.timeCode]);
      }
    }
  }

  return segments;
};

WebmParser.prototype.getSegmentsCount = function(mpd, adaptId, repId) {
  var adaptIndex = getAdaptionSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var length;
  if(rep) {
    if(rep.SegmentList) {
      length = rep.SegmentList[0].SegmentURL.length;
    }
  }

  return length;
};

WebmParser.prototype.getInit = function(mpd, adaptId, repId) {
  var adaptIndex = getAdaptionSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var init;
  if(rep) {
    if(rep.SegmentList) {
      init = rep.SegmentList[0].Initialization[0].$.range;
    }
  }

  return init;
};

WebmParser.prototype.getMimeType = function(mpd, adaptId) {
  var adaptIndex = getAdaptionSetIndex(mpd, adaptId);
  var mimeType;

  var adaptSets = getAdaptionSets(mpd);
  if(adaptSets && adaptSets[adaptIndex]) {
    var type = adaptSets[adaptIndex].$.mimeType;
    var codec = adaptSets[adaptIndex].$.codecs;

    mimeType = `${type}; codecs="${codec}"`
  }

  return mimeType;
};

WebmParser.prototype.getTracks = function(mpd) {
  var representationSets = [];

  var adaptSets = getAdaptionSets(mpd);
  for(var i in adaptSets) {
    if(adaptSets[i].Representation) {
      var repSets = adaptSets[i].Representation;

      for(var j in repSets) {
        representationSets.push(this.getTrack(mpd, i, repSets[j].$.id));
      }
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
  var adaptSets = getAdaptionSets(mpd);
  var type = null;

  if(adaptSets !== null && adaptSets[adaptIndex] !== null && adaptSets[adaptIndex] !== undefined) {
    type = adaptSets[adaptIndex].$.mimeType;
    type = type.split("/")[0];
  }

  return type;
};

WebmParser.prototype.getAdaptionSetIndex = function(mpd, adaptId) {
  return getAdaptionSetIndex(mpd, adaptId);
};

module.exports = WebmParser;

var getAdaptionSetIndex = function(mpd, adaptId) {
  var adaptSets = getAdaptionSets(mpd);

  for(var i = 0; i < adaptSets.length; ++i) {
    if(adaptSets[i].$.id == adaptId) {
      return i;
    }
  }
};

var getAdaptionSets = function(mpd) {
  var adaptionSets;

  if(mpd) {
    var period = mpd.Period;
    if(period && period.length > 0) {
      var adaptionSet = period[0].AdaptationSet;
      if(adaptionSet) {
        adaptionSets = adaptionSet;
      }
    }
  }

  return adaptionSets;
}

var getRepresentationSet = function(mpd, adaptIndex, repId) {
  var adaptSets = getAdaptionSets(mpd);

  if(adaptSets && adaptSets[adaptIndex]) {
    var reps = adaptSets[adaptIndex].Representation;
    for(var i in reps) {
      if(reps[i].$.id === repId) {
        return reps[i];
      }
    }
  }
};
