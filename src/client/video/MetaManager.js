const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var metaDataList, activeMetaData, socket, schemaFactory, log;

function MetaManager() { }

MetaManager.prototype.initialize = function(force) {
  if(typeof MetaManager.prototype.protoInit === 'undefined') {
    MetaManager.prototype.protoInit = true;
    var logManager  = this.factory.createClientLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
    schemaFactory   = this.factory.createSchemaFactory();
  }

  if(force === undefined ? typeof MetaManager.prototype.stateInit === 'undefined' : force) {
    MetaManager.prototype.stateInit = true;
    socket        = this.factory.createClientSocket();
    metaDataList  = new Map();
  }
};

MetaManager.prototype.requestMetaData = Promise.coroutine(function* () {
  var fileBuffer = this.factory.createFileBuffer();
  var files = yield fileBuffer.requestFilesAsync();

  if(files) {
    for(var i = 0; i < files.length; ++i) {
      var type = files[i][0].type;
      var binary = files[i][1];
      var util;

      if(type === 'webm') {
        util = this.factory.createWebmParser();
      } else if(type === 'mp4') {
        util = this.factory.createMp4Parser();
      }

      var mpdMeta = this.factory.createMpdMeta();
      mpdMeta.setMpd(binary.toString(), util);
      metaDataList.set(type, mpdMeta);

      if(!activeMetaData && type === 'webm') {
        var trackInfo = this.getTrackInfo().get(type);
        var videoIndex = trackInfo.video && trackInfo.video.length > 0 ? trackInfo.video[0].index : null;
        var audioIndex = trackInfo.audio && trackInfo.audio.length > 0 ? trackInfo.audio[0].index : null;

        var metaInfo = this.buildMetaInfo(type, videoIndex, audioIndex, trackInfo.subtitle);
        this.setActiveMetaData(metaInfo);
      }
    }
  }
});

MetaManager.prototype.setActiveMetaData = function(metaInfo) {
  var metaData = metaDataList.get(metaInfo.key);

  if(metaInfo.video) {
    metaData.selectTrackQuality(SourceBuffer.Enum.VIDEO, metaInfo.video);
  }

  if(metaInfo.audio) {
    metaData.selectTrackQuality(SourceBuffer.Enum.AUDIO, metaInfo.audio);
  }

  if(activeMetaData !== metaData) {
    activeMetaData = metaData;
  }
};

MetaManager.prototype.setBufferThreshold = function(threshold) {
  for(var meta of metaDataList) {
    meta[1].setThreshold(threshold);
  }
};

MetaManager.prototype.getActiveMetaData = function() {
  return activeMetaData;
};

MetaManager.prototype.getTrackInfo = function() {
  var tracks = new Map();
  var activeKeys = null;

  for(var meta of metaDataList) {
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

    if(meta[1] === activeMetaData) {
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
