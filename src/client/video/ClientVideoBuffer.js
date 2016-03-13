var DOMParser         = require('xmldom').DOMParser;
var log               = require('loglevel');

var ClientSocket      = require('../socket/ClientSocket.js');
var RequestFactory    = require('../socket/ClientRequestFactory.js');

var windowSrc;
var mediaSource;
var videoBuffer;

var queue;
var clientVideo;

var utils;

var hasInitSeg;
var closeStream;

var self;

function ClientVideoBuffer(){}

ClientVideoBuffer.prototype.initialize = function (video, window, clientUtils) {
  log.setDefaultLevel(0);
  log.info('ClientVideoBuffer.initialize');

  windowSrc   = window;
  mediaSource = null;
  videoBuffer = null;

  queue       = new Array();
  clientVideo = video;
  hasInitSeg  = false;

  utils       = clientUtils;

  closeStream = false;

  self        = this;

  clientVideo.on('get-init', function(){
    ClientVideoBuffer.initializeMediaSource();
  });

  clientVideo.on('get-next', function(){
    ClientVideoBuffer.requestVideoData(clientVideo.getActiveMetaData().getNextSegment());
  });

  clientVideo.on('get-segment', function(){
    console.log("we are seeking");
    ClientVideoBuffer.requestVideoData(clientVideo.getActiveMetaData().getSegment(clientVideo.getVideoElement.currentTime));
  });
}

ClientVideoBuffer.initializeMediaSource = function() {
  log.info('ClientVideoBuffer.initializeMediaSource');
  mediaSource = utils.getNewMediaSourceObject();
  clientVideo.getVideoElement().src = windowSrc.URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen',         mediaSourceCallback, false);
  mediaSource.addEventListener('webkitsourceopen',   mediaSourceCallback, false);
  mediaSource.addEventListener('sourceended',        objectState,         false);
  mediaSource.addEventListener('webkitsourceended',  objectState,         false);
};

ClientVideoBuffer.requestVideoData = function(requestDetails) {
  log.info('ClientVideoBuffer.requestVideoData');
  ClientSocket.sendRequest("get-segment",
    RequestFactory.buildVideoSegmentRequest(requestDetails[0], requestDetails[1]));
};

ClientVideoBuffer.prototype.bufferSegment = function(data) {
  if (videoBuffer.updating || mediaSource.readyState != "open" || queue.length > 0) {
    queue.push(new Uint8Array(data));
  } else {
    videoBuffer.appendBuffer(new Uint8Array(data));
  }

  if(!hasInitSeg) {
    console.log("Init segment has been received.");
    hasInitSeg = true;

    ClientVideoBuffer.requestVideoData(clientVideo.getActiveMetaData().getSegment(0));
    clientVideo.addVideoEvents();
  }
};

ClientVideoBuffer.prototype.closeStream = function() {
  log.info('ClientVideoBuffer.closeStream');
  /*if (queue.length > 0) {
    closeStream = true;
  } else {
    mediaSource.endOfStream();
  }*/
}

module.exports = ClientVideoBuffer;

function objectState(e) {
  log.info("ClientVideoBuffer's objectState");
  console.log(e.target + " ready state : " + e.readyState);
  console.log(e);
};

function mediaSourceCallback(e) {
  log.info("ClientVideoBuffer's mediaSourceCallback");
  if(videoBuffer === null){
    videoBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
    //videoBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64000d,mp4a.40.2"');

    videoBuffer.addEventListener('error',  objectState);
    videoBuffer.addEventListener('abort',  objectState);
    videoBuffer.addEventListener('update', onBufferUpdate);

    ClientVideoBuffer.requestVideoData(clientVideo.getActiveMetaData().getInit());
  }
};

function onBufferUpdate(e) {
  if(!videoBuffer.updating){
    if (queue.length > 0) {
      videoBuffer.appendBuffer(queue.shift());
    } else if(closeStream){
      mediaSource.endOfStream();
    }
  }
};
