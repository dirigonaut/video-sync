function ClientVideo(video) {
  this.videoElement  = video;
  this.webmJson      = null;
  this.mp4Mpd        = null;
  this.selectedType  = 'webm';
  this.videoPath     = null;
  this.audioPath     = null;
}

ClientVideo.prototype.addEventToVideo = function(event, callback) {
  this.videoElement.addEventListener(event, callback, false);
};

ClientVideo.prototype.removeEventFromVideo = function(event, callback) {
  this.videoElement.removeEventListener(event, callback, false);
};

ClientVideo.prototype.getVideoElement = function() {
  return this.videoElement;
};

ClientVideo.prototype.getSelectedType = function() {
  return this.selectedType;
};

ClientVideo.prototype.setSelectedType = function(selectedType) {
  this.selectedType = selectedType;
};

ClientVideo.prototype.loadVideoMeta = function() {
  if(this.setSelectedType == 'webm') {
    this._loadWebmJson();
  } else if(this.setSelectedType == 'mp4') {
    this._loadMp4Mpd();
  }
};

ClientVideo.prototype._loadMp4Mpd = function() {
  ClientSocket.sendRequest("video-mp4",
    requestFactory.buildVideoRequest(url, segment));
};

ClientVideo.prototype._loadWebmJson = function() {
  ClientSocket.sendRequest("video-webm",
    requestFactory.buildVideoRequest(url, segment));
};

ClientVideo.prototype.setWebmJson = function(webmJson) {
  this.webmJson = webmJson;
};

ClientVideo.prototype.setMp4Mpd = function(mp4Mpd) {
  this.mp4Mpd = mp4Mpd;
};

ClientVideo.prototype.getSegment = function(timeStamp) {
  var segRange = null;

  if(selectedType == 'webm') {
    segRange = this._getWebmSegment(timeStamp);
  } else if(selectedType = 'mp4') {
    segRange = this._getMp4Segment(timeStamp);
  }

  return segRange;
};

ClientVideo.prototype._getWebmSegment = function(timeStamp) {
  //console.log(this.segments);
  var segment = new Object();
  segment.start = 377;
  segment.end = 411017;
  return segment;
  /*return this.segments.get((videoElement.currentTime + this.chunkLength) -
      (videoElement.currentTime % this.chunkLength));*/
};

ClientVideo.prototype._getMp4Segment = function(timeStamp) {

};

ClientVideo.prototype.getInitSegment = function() {
  var segRange = null;

  if(selectedType == 'webm') {
    segRange = this._getWebmInitSegment();
  } else if(selectedType = 'mp4') {
    segRange = this._getMp4InitSegment();
  }

  return segRange;
};

ClientVideo.prototype._getWebmInitSegment = function() {
  var baseUrl = mpdData.querySelectorAll("BaseURL")[0].textContent.toString();
  var init = mpdData.querySelectorAll("Initialization")[0];

  if(init !== null){
    var range = init.attributes.getNamedItem("range").value;
    range = range.split("-");

    if(range !== null){
      var segment = new Object();
      segment.start = range[0];
      segment.end = range[1] -1;
    }
  }

  return [path + base, segment];
};

ClientVideo.prototype._getMp4InitSegment = function() {

};
module.exports = ClientVideo;
