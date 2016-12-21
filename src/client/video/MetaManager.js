const util          = require('util');
const EventEmitter  = require('events');

var ClientSocket    = require('../socket/ClientSocket.js');
var SourceBuffer    = require('./SourceBuffer.js');
var MpdMeta         = require('./meta/MpdMeta.js');
var Mp4Parser       = require('./meta/Mp4Parser.js');
var WebmParser      = require('./meta/WebmParser.js');

var clientSocket = new ClientSocket();

var _this = null;

function MetaManager() {
  this.metaDataList   = null;
  this.activeMetaData = null;

  _this = this;
}

util.inherits(MetaManager, EventEmitter);

MetaManager.prototype.requestMetaData = function(fileBuffer) {
  _this.metaDataList = new Map();

  var addMetaData = function(header, binaryFile) {
    console.log('MetaManager.addMetaData');
    var util = null;

    if(header.type === 'webm') {
      util = new WebmParser();
    } else if(header.type === 'mp4') {
      util = new Mp4Parser();
    }

    _this.metaDataList.set(header.type, new MpdMeta(binaryFile.toString(), util));

    if(_this.activeMetaData === null && header.type === 'webm') {
      var trackInfo = _this.getTrackInfo().get(header.type);
      var metaInfo = _this.buildMetaInfo(header.type, trackInfo.video[0].index, trackInfo.audio[0].index, trackInfo.subtitle);
      _this.setActiveMetaData(metaInfo);
    }

    _this.emit('meta-data-loaded');
  };

  clientSocket.sendRequest('get-meta-files', fileBuffer.registerRequest(addMetaData));
};

MetaManager.prototype.setActiveMetaData = function(metaInfo) {
  var metaData = _this.metaDataList.get(metaInfo.key);
  console.log(_this);

  metaData.selectTrackQuality(SourceBuffer.Enum.VIDEO, metaInfo.video);
  metaData.selectTrackQuality(SourceBuffer.Enum.AUDIO, metaInfo.audio);

  if(_this.activeMetaData !== metaData) {
    _this.activeMetaData = metaData;
    _this.emit('meta-data-activated');
  }
};

MetaManager.prototype.setBufferThreshold = function(threshold) {
  for(var meta of _this.metaDataList) {
    meta[1].setThreshold(threshold);
  }
};

MetaManager.prototype.getActiveMetaData = function() {
  return _this.activeMetaData;
};

MetaManager.prototype.getTrackInfo = function() {
  var tracks = new Map();
  var activeKeys = null;

  for(var meta of _this.metaDataList) {
    var videoTracks = [];
    var audioTracks = [];

    var rawTracks = meta[1].getTracks();
    for(var i in rawTracks) {
      var trackNameSplit = rawTracks[i].url.split('.')[0].split('_');
      var quality = trackNameSplit[trackNameSplit.length -1];
      var track = { 'index' : rawTracks[i].index, 'quality' : quality};

      if(rawTracks[i].type === 'video') {
        videoTracks.push(track);
      } else if(rawTracks[i].type === 'audio') {
        audioTracks.push(track);
      }
    }

    if(meta[1] === _this.activeMetaData) {
      var trackInfo = meta[1].getActiveTrackInfo();
      activeKeys = {};
      activeKeys.type = meta[0];
      activeKeys.video = trackInfo.get(SourceBuffer.Enum.VIDEO).getTrackIndex();
      activeKeys.audio = trackInfo.get(SourceBuffer.Enum.AUDIO).getTrackIndex();
      activeKeys.subtitle = null;
    }

    var trackSet = {'video' : videoTracks, 'audio': audioTracks};
    tracks.set(meta[0], trackSet);
  }

  tracks.set('active', activeKeys);
  return tracks;
};

MetaManager.prototype.buildMetaInfo = function(key, video, audio, subtitle) {
  var metaInfo = {};

  metaInfo.key = key;
  metaInfo.video = video;
  metaInfo.audio = audio;
  metaInfo.subtitle = subtitle;

  return metaInfo;
};

module.exports = MetaManager;
