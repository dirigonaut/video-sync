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
      this.getSourceBufferCallback(this.clientVideo));

  this.clientVideo.addMediaSourceEvent('sourceended',
      this.sourceBuffers[SourceBuffer.Enum.VIDEO].objectState);
  this.clientVideo.addMediaSourceEvent('sourceended',
      this.sourceBuffers[SourceBuffer.Enum.AUDIO].objectState);

  this.clientVideo.initialize(fileBuffer);

  this.clientVideo.addVideoEvent('timeupdate', this.clientVideo.onProgress(SourceBuffer.Enum.VIDEO));
  this.clientVideo.addVideoEvent('timeupdate', this.clientVideo.onProgress(SourceBuffer.Enum.AUDIO));

  this.clientVideo.addVideoEvent('seeking', this.clientVideo.onSeek(SourceBuffer.Enum.VIDEO));
  this.clientVideo.addVideoEvent('seeking', this.clientVideo.onSeek(SourceBuffer.Enum.AUDIO));
};

PlayerController.prototype.bufferSegment = function(segment) {
  self.sourceBuffers[segment.typeId].bufferSegment(segment.data, self.clientVideo);
};

PlayerController.prototype.getSourceBufferCallback = function() {
  console.log("PlayerController.getSourceBufferCallback");
  self = this;

  return (function(e) {
    //TODO: This would be a good point to start having the buffer type be dynamic
    //sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64000d,mp4a.40.2"');
    if(self.sourceBuffers[SourceBuffer.Enum.VIDEO] != null) {
      console.log("SourceBuffer's mediaSourceCallback VIDEO");
      self.sourceBuffers[SourceBuffer.Enum.VIDEO].sourceBuffer = self.clientVideo.mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
      self.sourceBuffers[SourceBuffer.Enum.VIDEO].sourceBuffer.addEventListener('error',  self.sourceBuffers[SourceBuffer.Enum.VIDEO].objectState);
      self.sourceBuffers[SourceBuffer.Enum.VIDEO].sourceBuffer.addEventListener('abort',  self.sourceBuffers[SourceBuffer.Enum.VIDEO].objectState);
      self.sourceBuffers[SourceBuffer.Enum.VIDEO].sourceBuffer.addEventListener('update', self.sourceBuffers[SourceBuffer.Enum.VIDEO].getOnBufferUpdate());
    }

    if(self.sourceBuffers[SourceBuffer.Enum.AUDIO] != null) {
      console.log("SourceBuffer's mediaSourceCallback AUDIO");
      self.sourceBuffers[SourceBuffer.Enum.AUDIO].sourceBuffer = self.clientVideo.mediaSource.addSourceBuffer('audio/webm; codecs="vorbis"');
      self.sourceBuffers[SourceBuffer.Enum.AUDIO].sourceBuffer.addEventListener('error',  self.sourceBuffers[SourceBuffer.Enum.AUDIO].objectState);
      self.sourceBuffers[SourceBuffer.Enum.AUDIO].sourceBuffer.addEventListener('abort',  self.sourceBuffers[SourceBuffer.Enum.AUDIO].objectState);
      self.sourceBuffers[SourceBuffer.Enum.AUDIO].sourceBuffer.addEventListener('update', self.sourceBuffers[SourceBuffer.Enum.AUDIO].getOnBufferUpdate());
    }
  });
};

module.exports = PlayerController;
