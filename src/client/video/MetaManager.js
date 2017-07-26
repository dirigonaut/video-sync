const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var metaDataList, activeMetaData, socket, schemaFactory, log;

function MetaManager() { }

MetaManager.prototype.initialize = function() {
  metaDataList   = new Map();
};

MetaManager.prototype.requestMetaData = function(fileBuffer) {
  var addMetaData = function(header, binaryFile) {
    console.log('MetaManager.addMetaData');
    var util = null;

    if(header.type === 'webm') {
      util = new WebmParser();
    } else if(header.type === 'mp4') {
      util = new Mp4Parser();
    }

    console.log(fileBuffer)
    _this.metaDataList.set(header.type, new MpdMeta(binaryFile.toString(), util));

    if(_this.activeMetaData === null && header.type === 'webm') {
      var trackInfo = _this.getTrackInfo().get(header.type);
      var videoIndex = trackInfo.video && trackInfo.video.length > 0 ? trackInfo.video[0].index : null;
      var audioIndex = trackInfo.audio && trackInfo.audio.length > 0 ? trackInfo.audio[0].index : null;

      var metaInfo = _this.buildMetaInfo(header.type, videoIndex, audioIndex, trackInfo.subtitle);
      _this.setActiveMetaData(metaInfo);
    }

    _this.emit('meta-data-loaded');
  };

  var request = {};
  request.data = fileBuffer.registerRequest(addMetaData)
  clientSocket.sendRequest('get-meta-files', request);
};

MetaManager.prototype.setActiveMetaData = function(metaInfo) {
  var metaData = _this.metaDataList.get(metaInfo.key);

  if(metaInfo.video !== null) {
    metaData.selectTrackQuality(SourceBuffer.Enum.VIDEO, metaInfo.video);
  }

  if(metaInfo.audio !== null) {
    metaData.selectTrackQuality(SourceBuffer.Enum.AUDIO, metaInfo.audio);
  }

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
      activeKeys.video = trackInfo.get(SourceBuffer.Enum.VIDEO) !== undefined ? trackInfo.get(SourceBuffer.Enum.VIDEO).getTrackIndex() : null;
      activeKeys.audio = trackInfo.get(SourceBuffer.Enum.AUDIO) !== undefined ? trackInfo.get(SourceBuffer.Enum.AUDIO).getTrackIndex() : null;
      activeKeys.subtitle = null;
    }

    var trackSet = {'video' : videoTracks, 'audio': audioTracks};
    tracks.set(meta[0], trackSet);
  }

  tracks.set('active', activeKeys);
  return tracks;
};

MetaManager.prototype.buildMetaInfo = function(key, video, audio, subtitle) {
  return {
    key: key,
    video: video,
    audio: audio,
    subtitle: subtitle,
  };
};

module.exports = MetaManager;
