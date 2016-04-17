var SourceBuffer = require('./SourceBuffer.js');
var ClientVideo = require('./ClientVideo.js');

var fileBuffer;
var self;

function PlayerController(fBuffer) {
  console.log("PlayerController");
  if(self == null) {
    this.clientVideo;
    this.sourceBuffers;

    fileBuffer = fBuffer;
    self = this;
  }
}

PlayerController.prototype.initializeVideo = function(element, mediaSource, window) {
  console.log("PlayerController.initializeVideo");
  this.clientVideo = new ClientVideo(element, mediaSource, window);

  this.sourceBuffers = new Array(2);
  this.sourceBuffers[SourceBuffer.Enum.VIDEO] = new SourceBuffer(SourceBuffer.Enum.VIDEO, this.clientVideo);
  this.sourceBuffers[SourceBuffer.Enum.AUDIO] = new SourceBuffer(SourceBuffer.Enum.AUDIO, this.clientVideo);

  this.clientVideo.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.VIDEO].setSourceBufferCallback('video/webm; codecs="vp9"'));
  this.clientVideo.addMediaSourceEvent('sourceopen',
    this.sourceBuffers[SourceBuffer.Enum.AUDIO].setSourceBufferCallback('audio/webm; codecs="vorbis"'));

  this.clientVideo.initialize(fileBuffer);

  this.clientVideo.addVideoEvent('timeupdate', this.clientVideo.onProgress(SourceBuffer.Enum.VIDEO));
  this.clientVideo.addVideoEvent('timeupdate', this.clientVideo.onProgress(SourceBuffer.Enum.AUDIO));

  this.clientVideo.addVideoEvent('seeking', this.clientVideo.onSeek(SourceBuffer.Enum.VIDEO));
  this.clientVideo.addVideoEvent('seeking', this.clientVideo.onSeek(SourceBuffer.Enum.AUDIO));
};

PlayerController.prototype.bufferSegment = function(segment) {
  self.sourceBuffers[segment.typeId].bufferSegment(segment.data, self.clientVideo);
};

module.exports = PlayerController;
