var DOMParser         = require('xmldom').DOMParser;
var log               = require('loglevel');

var ClientFileBuffer  = require('./ClientFileBuffer.js');
var ClientSocket      = require('../client_scripts/ClientSocket.js');
var RequestFactory    = require('../client_scripts/ClientRequestFactory.js');

var windowSrc;
var mediaSource;
var videoBuffer;

var queue;
var clientVideo;
var fileBuffer;

var utils;

var hasInitSeg;
var closeStream;

var self;

function ClientVideoBuffer(){}

ClientVideoBuffer.prototype.initialize = function (video, window, clientUtils) {
  log.setDefaultLevel(0);
  log.info('ClientVideoBuffer.initializeMediaSource');

  windowSrc   = window;
  mediaSource = null;
  videoBuffer = null;

  queue       = new Array();
  clientVideo = video;
  hasInitSeg  = false;

  fileBuffer  = new ClientFileBuffer();
  utils       = clientUtils;

  closeStream = false;

  self        = this;

  clientVideo.addMetaLoadedEvent(ClientVideoBuffer.initializeMediaSource);
  clientVideo.addSegmentRequestCallback(ClientVideoBuffer.requestSegment);
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

ClientVideoBuffer.requestVideoData = function(url, segment) {
  log.info('ClientVideoBuffer.requestVideoData');
  console.log(segment);
  ClientSocket.sendRequest("get-segment",
    RequestFactory.buildVideoSegmentRequest(url, segment));
};

ClientVideoBuffer.prototype.bufferSegment = function(data) {
  log.info('ClientVideoBuffer.bufferSegment');

  if (videoBuffer.updating || mediaSource.readyState != "open" || queue.length > 0) {
    console.log("Adding to the queue.");
    queue.push(new Uint8Array(data));
  } else {
    console.log("Direct buffer append.");
    console.log("mediaSource ready state: " + mediaSource.readyState);
    videoBuffer.appendBuffer(new Uint8Array(data));
  }

  if(!hasInitSeg) {
    console.log("Init segment has been received.");
    hasInitSeg = true;

    var requestDetails = clientVideo.getSegment(7, true);
    ClientVideoBuffer.requestVideoData(requestDetails[0], requestDetails[1]);

    clientVideo.addOnProgress();
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

ClientVideoBuffer.prototype.bufferMetaFile = function(data) {
  log.info('ClientVideoBuffer.bufferMetaFile');
  if(data != null) {
    fileBuffer.pushData(data);
  }
};

ClientVideoBuffer.prototype.setMetaData = function() {
  log.info('ClientVideoBuffer.setMp4Mpd');
  var parser = new DOMParser();
  clientVideo.setMetaData(fileBuffer.getBuffer().toString());
  fileBuffer.clearBuffer();
};

ClientVideoBuffer.requestSegment = function () {
  log.info('ClientVideoBuffer.requestSegment');
  var requestDetails = clientVideo.getNextSegment(true);
  ClientVideoBuffer.requestVideoData(requestDetails[0], requestDetails[1]);
};

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

    var initRequestDetails = clientVideo.getInitSegment();
    ClientVideoBuffer.requestVideoData(initRequestDetails[0], initRequestDetails[1]);
  }
};

function onBufferUpdate(e) {
  log.info("ClientVideoBuffer's onBufferUpdate");
  if(!videoBuffer.updating){
    if (queue.length > 0) {
      console.log("Appending from the queue.");
      console.log("mediaSource ready state: " + mediaSource.readyState);
      videoBuffer.appendBuffer(queue.shift());
    } else if(closeStream){
      console.log("Closing mediaSource.");
      mediaSource.endOfStream();
    }
  }
};
