var videoElement = null;

function ClientVideo(video){
  videoElement = video;
  this.chunkLength = 0;
}

ClientVideo.prototype.addEventToVideo = function(event, callback) {
  videoElement.addEventListener(event, callback, false);
};

ClientVideo.prototype.removeEventFromVideo = function(event, callback) {
  videoElement.removeEventListener(event, callback, false);
};

ClientVideo.prototype.play = function() {
  videoElement.play();
}

ClientVideo.prototype.getVideoElement = function() {
  return videoElement;
}

ClientVideo.prototype.setChunkLength = function(length) {
  this.chunkLength = length;
}

module.exports = ClientVideo;
