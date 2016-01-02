window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var mediaSource;
var videoBuffer;

var queue;
var clientVideo;

var mpdData;
var fileBuffer;
var hasInitSeg;

var closeStream;

var self;

var index = 0;

function ClientStream(videoElement){
  mediaSource = null;
  videoBuffer = null;

  queue       = new Array();
  clientVideo = new ClientVideo(videoElement);
  hasInitSeg  = false;

  mpdData     = null;
  fileBuffer  = new ClientFileBuffer();
  hasInitSeg  = false;

  closeStream = false;

  self        = this;

  clientVideo.addEventToVideo('play', onPlay);
};

ClientStream.prototype.startStream = function() {
  console.log("startStream");
  console.log(clientVideo);
  clientVideo.play();
};

ClientStream.prototype.loadMpd = function() {
  console.log("loadMpd");
  var parser = new DOMParser();
  mpdData = parser.parseFromString(fileBuffer.getBuffer().toString(), "text/xml", 0);
  console.log(mpdData.querySelectorAll("BaseURL")[0].textContent.toString());

  fileBuffer.clearBuffer();

  this.initializeVideo();
};

ClientStream.prototype.initializeVideo = function (){
  console.log("initializeVideo");
  mediaSource = new MediaSource();
  clientVideo.getVideoElement().src = window.URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen',         mediaSourceCallback, false);
  mediaSource.addEventListener('webkitsourceopen',   mediaSourceCallback, false);
  mediaSource.addEventListener('sourceended',        objectState,         false);
  mediaSource.addEventListener('webkitsourceended',  objectState,         false);
};

ClientStream.prototype.requestVideoData = function (url, spec){
  console.log("requestSegment");

  //Still want this to have a callback referencing bufferSegment
  if(hasInitSeg) {
    ClientSocket.sendRequest("video-segment",
      requestFactory.buildVideoTimestampRequest(url, spec));
  } else {
    ClientSocket.sendRequest("video-init",
      requestFactory.buildVideoRangeRequest(url, spec));
  }
};

ClientStream.prototype.bufferSegment = function (data){
  console.log("bufferSegment");
  if(data !== null){
    if (videoBuffer.updating || mediaSource.readyState != "open" || queue.length > 0) {
      queue.push(new Uint8Array(data));
    } else {
      console.log("Direct buffer append.")
      videoBuffer.appendBuffer(new Uint8Array(data));
    }
  } else {
     if (mediaSource.readyState == "open" && !videoBuffer.updating && queue.length == 0) {
      console.log("Closing mediaSource.");
      mediaSource.endOfStream();
    } else if(mediaSource.readyState == "open" && queue.length == 0){
      //console.log("closeStream = true");
      //closeStream = true;
    }
  }
};

ClientStream.prototype.printSeg = function(data) {
  console.log("printSeg");
  if(data){
    var parser = new DOMParser();
    var buffer = new Buffer(data);
    console.log(parser.parseFromString(buffer.toString(), "text/xml", 0));
  }
};

ClientStream.prototype.bufferMetadata = function (data){
  console.log("bufferMetadata");
  if(data != null) {
    //console.log(data);
  }
};

ClientStream.prototype.bufferFile = function (data){
  console.log("bufferFile");
  if(data != null) {
    fileBuffer.pushData(data);
  }
};

ClientStream.prototype.initialize = function () {
  var segRange = base.querySelectorAll("Initialization");
  segRange = segRange[0].attributes.getNamedItem("range").value

  console.log("Init range: " + range);

  if(range !== null){
    this.requestVideoData(baseUrl, segRange);
    hasInitSeg = true;
  }
};

ClientStream.prototype.requestSegment = function (timestamp) {
  console.log("isReadyForNextSegment");
  var baseUrl = mpdData.querySelectorAll("BaseURL")[0].textContent.toString();
  console.log(baseUrl)

  if(hasInitSeg){
    var timestamp = this.getRequestedTime(base);

    if(range !== null){
      this.requestVideoData(baseUrl, timestamp);
    } else {
      mediaSource.endOfStream();
    }
  }
};

function objectState(e){
  console.log(e.target + " ready state : " + e.readyState);
  console.log(e);
};

function mediaSourceCallback(e) {
  console.log("mediaSourceCallback");
  if(videoBuffer === null){
    console.log("Creating Buffer.");
    //videoBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8,vorbis"');
    videoBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64000d,mp4a.40.2"');

    videoBuffer.addEventListener('error',  objectState);
    videoBuffer.addEventListener('abort',  objectState);
    videoBuffer.addEventListener('update', onBufferUpdate);

    self.isReadyForNextSegment();
  }
};

function onBufferUpdate(e){
  console.log("onBufferUpdate");
  if(!videoBuffer.updating){
    if (queue.length > 0) {
      console.log("Appending from the queue.");
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
  ClientSocket.sendRequest('video-load',
    requestFactory.buildMpdFileRequest("/home/sabo-san/Development/video-sync-2/html/video.mpd"));
    clientVideo.removeEventFromVideo("play", onPlay, false);
};

function onTimeUpdate() {
  console.log("onTimeUpdate");
  if(clientVideo.getVideoElement)
  ClientSocket.sendRequest('video-load',
    requestFactory.buildMpdFileRequest("/home/sabo-san/Development/video-sync-2/html/video.mpd"));
    clientVideo.removeEventFromVideo("play", onPlay, false);
};
