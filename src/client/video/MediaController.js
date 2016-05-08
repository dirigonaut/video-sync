var SourceBuffer = require('./SourceBuffer.js');
var VideoSingleton = require('./VideoSingleton.js');

var fileBuffer;
var self;

function MediaController(fBuffer) {
  console.log("MediaController");
  if(self == null) {
    this.video;
    this.sourceBuffers;

    fileBuffer = fBuffer;
    self = this;
  }
}

MediaController.prototype.initializeVideo = function(element, mediaSource, window) {
  console.log("MediaController.initializeVideo");
  this.videoSingleton = new VideoSingleton(element, mediaSource, window);

  this.sourceBuffers = new Array(2);
  this.sourceBuffers[SourceBuffer.Enum.VIDEO] = new SourceBuffer(SourceBuffer.Enum.VIDEO, this.videoSingleton);
  this.sourceBuffers[SourceBuffer.Enum.AUDIO] = new SourceBuffer(SourceBuffer.Enum.AUDIO, this.videoSingleton);

  this.videoSingleton.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.VIDEO].setSourceBufferCallback('video/webm; codecs="vp9"'));
  this.videoSingleton.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.AUDIO].setSourceBufferCallback('audio/webm; codecs="vorbis"'));

  this.videoSingleton.initialize(fileBuffer);

  this.videoSingleton.addVideoEvent('timeupdate', this.videoSingleton.onProgress(SourceBuffer.Enum.VIDEO));
  this.videoSingleton.addVideoEvent('timeupdate', this.videoSingleton.onProgress(SourceBuffer.Enum.AUDIO));

  this.videoSingleton.addVideoEvent('seeking', this.videoSingleton.onSeek(SourceBuffer.Enum.VIDEO));
  this.videoSingleton.addVideoEvent('seeking', this.videoSingleton.onSeek(SourceBuffer.Enum.AUDIO));
};

MediaController.prototype.bufferSegment = function(segment) {
  self.sourceBuffers[segment.typeId].bufferSegment(segment.data, self.videoSingleton);
};

MediaController.prototype.getVideoSingleton = function() {
  return this.videoSingleton;
};

module.exports = MediaController;
