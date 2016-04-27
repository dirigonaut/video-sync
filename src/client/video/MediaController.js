var SourceBuffer = require('./SourceBuffer.js');
var video = require('./VideoSingleton.js');

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
  this.video = new video(element, mediaSource, window);

  this.sourceBuffers = new Array(2);
  this.sourceBuffers[SourceBuffer.Enum.VIDEO] = new SourceBuffer(SourceBuffer.Enum.VIDEO, this.video);
  this.sourceBuffers[SourceBuffer.Enum.AUDIO] = new SourceBuffer(SourceBuffer.Enum.AUDIO, this.video);

  this.video.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.VIDEO].setSourceBufferCallback('video/webm; codecs="vp9"'));
  this.video.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.AUDIO].setSourceBufferCallback('audio/webm; codecs="vorbis"'));

  this.video.initialize(fileBuffer);

  this.video.addVideoEvent('timeupdate', this.video.onProgress(SourceBuffer.Enum.VIDEO));
  this.video.addVideoEvent('timeupdate', this.video.onProgress(SourceBuffer.Enum.AUDIO));

  this.video.addVideoEvent('seeking', this.video.onSeek(SourceBuffer.Enum.VIDEO));
  this.video.addVideoEvent('seeking', this.video.onSeek(SourceBuffer.Enum.AUDIO));
};

MediaController.prototype.bufferSegment = function(segment) {
  self.sourceBuffers[segment.typeId].bufferSegment(segment.data, self.video);
};

module.exports = MediaController;
