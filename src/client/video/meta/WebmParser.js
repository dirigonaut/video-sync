function WebmParser() {

};

WebmParser.prototype.getBaseURL = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);
  var baseUrl = null;

  if(rep !== null) {
    baseUrl = rep.BaseURL[0];
  }

  return baseUrl;
};

WebmParser.prototype.getTimeStep = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var timeStep = null;
  if(rep !== null && rep !== undefined) {
    if(rep.SegmentList !== undefined && rep.SegmentList !== null) {
      var $ = rep.SegmentList[0].$;
      timeStep = $.duration / $.timescale;
    }
  }

  return timeStep;
};

WebmParser.prototype.getSegmentList = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var segments = [];
  if(rep !== null && rep !== undefined) {
    if(rep.SegmentList !== undefined && rep.SegmentList !== null) {
      var segmentURLs = rep.SegmentList[0].SegmentURL;

      for(var i in segmentURLs) {
        segments.push(segmentURLs[i].$.mediaRange);
      }
    }
  }

  return segments;
};

WebmParser.prototype.getSegmentsCount = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var length = null;
  if(rep !== null && rep !== undefined) {
    if(rep.SegmentList !== undefined && rep.SegmentList !== null) {
      length = rep.SegmentList[0].SegmentURL.length;
    }
  }

  return length;
};

WebmParser.prototype.getInit = function(mpd, adaptId, repId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var rep = getRepresentationSet(mpd, adaptIndex, repId);

  var init = null;
  if(rep !== null && rep !== undefined) {
    if(rep.SegmentList !== undefined && rep.SegmentList !== null) {
      init = rep.SegmentList[0].Initialization[0].$.range;
    }
  }

  return init;
};

WebmParser.prototype.getMimeType = function(mpd, adaptId) {
  var adaptIndex = getAdationSetIndex(mpd, adaptId);
  var mimeType = null;

  var adaptSets = getAdaptionSets(mpd);
  if(adaptSets !== null && adaptSets[adaptIndex] !== null && adaptSets[adaptIndex] !== undefined) {
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
    if(adaptSets[i].Representation !== null && adaptSets[i].Representation !== undefined) {
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
    type = type.split('/')[0];
  }

  return type;
};

module.exports = WebmParser;

var getAdationSetIndex = function(mpd, adaptId) {
  var adaptSets = getAdaptionSets(mpd);

  for(var i in adaptSets) {
    if(adaptSets[i].$.id == adaptId) {
      return i;
    }
  }
  return null;
};

var getAdaptionSets = function(mpd) {
  var adaptionSets = null;

  if(mpd !== null && mpd !== undefined) {
    var period = mpd.Period;
    if(period !== null && period !== undefined && period.length > 0) {
      var adaptionSet = period[0].AdaptationSet;
      if(adaptionSet !== null && adaptionSet !== undefined) {
        adaptionSets = adaptionSet;
      }
    }
  }

  return adaptionSets;
}

var getRepresentationSet = function(mpd, adaptIndex, repId) {
  var adaptSets = getAdaptionSets(mpd);

  if(adaptSets !== null && adaptSets[adaptIndex] !== null && adaptSets[adaptIndex] !== undefined) {
    var reps = adaptSets[adaptIndex].Representation;
    for(var i in reps) {
      if(reps[i].$.id === repId) {
        return reps[i];
      }
    }
  }
  return null;
};
