var videoElement = null;

function ClientVideo(video){
  videoElement = video;
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

module.exports = ClientVideo;
