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
  console.log(clientVideo);
  clientVideo.play();
};

ClientStream.prototype.loadMpd = function() {
  var parser = new DOMParser();
  mpdData = parser.parseFromString(fileBuffer.getBuffer().toString(), "text/xml", 0);
  console.log(mpdData.querySelectorAll("BaseURL")[0].textContent.toString());

  fileBuffer.clearBuffer();

  this.initializeVideo();
};

ClientStream.prototype.initializeVideo = function (){
  mediaSource = new MediaSource();
  clientVideo.getVideoElement().src = window.URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen',         mediaSourceCallback, false);
  mediaSource.addEventListener('webkitsourceopen',   mediaSourceCallback, false);
  mediaSource.addEventListener('sourceended',        objectState,         false);
  mediaSource.addEventListener('webkitsourceended',  objectState,         false);
};

ClientStream.prototype.requestSegment = function (url, timeSpan){
  //Still want this to have a callback referencing bufferSegment
  ClientSocket.sendRequest("video-stream",
    requestFactory.buildVideoSegmentRequest(url, timeSpan));
};

ClientStream.prototype.bufferSegment = function (data){
  if(data !== null){
    if (videoBuffer.updating || mediaSource.readyState != "open" || queue.length > 0) {
      queue.push(new Uint8Array(data));
    } else {
      console.log("Direct buffer append.")
      videoBuffer.appendBuffer(new Uint8Array(data));
    }
    self.isReadyForNextSegment();
  } else {
    if (mediaSource.readyState == "open" && !videoBuffer.updating && queue.length == 0) {
      console.log("Closing mediaSource.");
      mediaSource.endOfStream();
    } else if(mediaSource.readyState == "open" && queue.length == 0){
      closeStream = true;
    }
  }
};

ClientStream.prototype.printSeg = function(data) {
  if(data){
    var parser = new DOMParser();
    var buffer = new Buffer(data);
    console.log(parser.parseFromString(buffer.toString(), "text/xml", 0));
  }
};

ClientStream.prototype.bufferFile = function (data){
  if(data != null) {
    fileBuffer.pushData(data);
  }
};

ClientStream.prototype.isReadyForNextSegment = function () {
  var range = null;
  var baseUrl = mpdData.querySelectorAll("BaseURL")[0].textContent.toString();
  if(hasInitSeg){
    //TODO
    range = null;
  } else {
    var base = mpdData.querySelectorAll("Initialization")[0];
    range = base.getAttribute("range");
    hasInitSeg = true;
  }

  if(range !== null){
    this.requestSegment(baseUrl, range);
  }
};

ClientStream.prototype.calculateVideoSegmentLength = function () {
  //get range from mpdData
  var vidDur = range.split("-");
  return (((vidDur[1] - vidDur[0]) * 8))
}

function objectState(e){
  console.log(e.target + " ready state : " + e.readyState);
  console.log(e);
};

function mediaSourceCallback(e) {
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
  ClientSocket.sendRequest('video-load',
    requestFactory.buildMpdFileRequest("/home/sabo-san/Development/video-sync-2.0/html/video.mpd"));
    clientVideo.removeEventFromVideo("play", onPlay, false);
};
