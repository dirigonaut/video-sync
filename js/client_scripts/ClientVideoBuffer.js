window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var mediaSource;
var videoBuffer;

var queue;
var clientVideo;

var fileBuffer;
var hasInitSeg;

var closeStream;

var self;

var index = 0;

function ClientVideoBuffer(video){
  mediaSource = null;
  videoBuffer = null;

  queue       = new Array();
  clientVideo = video;
  hasInitSeg  = false;

  fileBuffer = new ClientFileBuffer();

  closeStream = false;

  self        = this;

  clientVideo.addEventToVideo('play', onPlay);
};

ClientVideoBuffer.prototype.initializeMediaSource = function (){
  console.log("initializeMediaSource");
  mediaSource = new MediaSource();
  clientVideo.getVideoElement().src = window.URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen',         mediaSourceCallback, false);
  mediaSource.addEventListener('webkitsourceopen',   mediaSourceCallback, false);
  mediaSource.addEventListener('sourceended',        objectState,         false);
  mediaSource.addEventListener('webkitsourceended',  objectState,         false);
};

ClientVideoBuffer.prototype.requestVideoData = function (url, segment){
  console.log("requestVideoData");
  ClientSocket.sendRequest("video-chunk",
    requestFactory.buildVideoRequest(url, segment));
};

ClientVideoBuffer.prototype.bufferSegment = function (data){
  console.log("bufferSegment");
  console.log(data.length);
  if(data !== null){
    if (videoBuffer.updating || mediaSource.readyState != "open" || queue.length > 0) {
      console.log("Adding to the queue.");
      queue.push(new Uint8Array(data));
    } else {
      console.log("Direct buffer append.");
      console.log(mediaSource.readyState);
      videoBuffer.appendBuffer(new Uint8Array(data));
    }
  } else {
     if (mediaSource.readyState == "open" && !videoBuffer.updating && queue.length == 0) {
      console.log("Closing mediaSource.");
      if(hasInitSeg) {
        mediaSource.endOfStream();
      }
    } else if(mediaSource.readyState == "open" && queue.length == 0){
      console.log("closeStream = true");
      //closeStream = true;
    }
  }
  
  if(!hasInitSeg){
    hasInitSeg = true;
    this.requestSegment(clientVideo.getNextSegment());
  }

  clientVideo.addEventToVideo('onTimeUpdate', onProgress);
};

ClientVideoBuffer.prototype.bufferMpdFile = function (data){
  console.log("bufferFile");
  if(data != null) {
    fileBuffer.pushData(data);
  }
};

ClientVideoBuffer.prototype.setMp4Mpd = function() {
  var parser = new DOMParser();
  clientVideo.setMp4Mpd(parser.parseFromString(fileBuffer.getBuffer().toString(), "text/xml", 0));
  fileBufer.clearBuffer();
  this.initializeVideo();
};

ClientVideoBuffer.prototype.setWebmJson = function(videoMeta) {
  clientVideo.setWebmJson(videoMeta);
  this.initializeVideo();
};

ClientVideoBuffer.prototype.initializeVideo = function() {
  console.log("initializeVideo");
  this.initializeMediaSource();
  this.requestVideoData(clientVideo.getInitSegment());
};

ClientVideoBuffer.prototype.requestSegment = function () {
  console.log("requestSegment");
  this.requestVideoData(clientVideo.getSegment(clientVideo.getVideoElement().timeStamp));
};

function objectState(e){
  console.log(e.target + " ready state : " + e.readyState);
  console.log(e);
};

function mediaSourceCallback(e) {
  console.log("mediaSourceCallback");
  if(videoBuffer === null){
    console.log("Creating Buffer.");
    videoBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
    //videoBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64000d,mp4a.40.2"');

    videoBuffer.addEventListener('error',  objectState);
    videoBuffer.addEventListener('abort',  objectState);
    videoBuffer.addEventListener('update', onBufferUpdate);

    self.initializeVideo();
  }
};

function onBufferUpdate(e){
  console.log("onBufferUpdate");
  videoBuffer.flushBufferQueue();
  if(!videoBuffer.updating){
    if (queue.length > 0) {
      console.log("Appending from the queue.");
      console.log(mediaSource.readyState);
      videoBuffer.appendBuffer(queue.shift());
    } else if(closeStream){
      console.log("Closing mediaSource.");
      mediaSource.endOfStream();
    }
  }
};

function onPlay() {
  //Make request for mpd file with client_socket
  console.log("onPlay");
  ClientSocket.sendRequest('video-file',
    requestFactory.buildMpdFileRequest(path + "/video.mpd"));
    clientVideo.removeEventFromVideo("play", onPlay);
};

function onProgress() {
  console.log("onProgress");
  if(clientVideo.nextSegmentTrigger()){
    self.requestSegment(clientVideo.getNextSegment());
    clientVideo.removeEventFromVideo("onTimeUpdate", onProgress);
  }
};
