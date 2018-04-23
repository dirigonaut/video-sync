const Promise = require('bluebird');
const Util    = require('util');
const Events  = require('events');

var metaDataList, activeMetaData, socket, eventKeys, schemaFactory, log;

function MetaManager() { }

MetaManager.prototype.initialize = function(force) {
  if(typeof MetaManager.prototype.protoInit === 'undefined') {
    MetaManager.prototype.protoInit = true;
    var logManager  = this.factory.createClientLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);
    schemaFactory   = this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    socket        = this.factory.createClientSocket();
  }
};

MetaManager.prototype.requestMetaData = Promise.coroutine(function* () {
  log.debug('MetaManager.requestMetaData');
  var fileBuffer = this.factory.createFileBuffer();
  var files = yield fileBuffer.requestFilesAsync(eventKeys.FILES);
  activeMetaData = undefined;
  metaDataList  = new Map();

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
      mpdMeta.setParser(util);
      yield mpdMeta.setMpd(binary.toString());
      metaDataList.set(type, mpdMeta);

      if(!activeMetaData && type === 'webm') {
        var trackInfo = this.getTrackInfo().get(type);
        var videoIndex = trackInfo.video && trackInfo.video.length > 0 ? trackInfo.video[0].index : undefined;
        var audioIndex = trackInfo.audio && trackInfo.audio.length > 0 ? trackInfo.audio[0].index : undefined;

        var metaInfo = this.buildMetaInfo(type, videoIndex, audioIndex, trackInfo.subtitle);
        this.setActiveMetaData(metaInfo);
      }
    }
  }
});

MetaManager.prototype.setActiveMetaData = function(metaInfo) {
  log.debug('MetaManager.setActiveMetaData');
  var metaData = metaDataList.get(metaInfo.key);

  if(metaInfo.video) {
    metaData.setTrackQuality(MetaManager.Enum.Types.VIDEO, metaInfo.video);
  }

  if(metaInfo.audio) {
    metaData.setTrackQuality(MetaManager.Enum.Types.AUDIO, metaInfo.audio);
  }

  if(activeMetaData !== metaData) {
    activeMetaData = metaData;
  }
};

MetaManager.prototype.setBufferThreshold = function(threshold) {
  log.debug('MetaManager.setBufferThreshold');
  for(var meta of metaDataList) {
    meta[1].setThreshold(threshold);
  }
};

MetaManager.prototype.getActiveMetaData = function() {
  return activeMetaData;
};

MetaManager.prototype.getTrackInfo = function() {
  log.debug('MetaManager.getTrackInfo');
  var tracks = new Map();
  var activeKeys;

  for(var meta of metaDataList) {
    var videoTracks = [];
    var audioTracks = [];

    var rawTracks = meta[1].getTracks();
    for(var i in rawTracks) {
      var trackNameSplit = rawTracks[i].url.split('.');
      trackNameSplit.pop();
      trackNameSplit = trackNameSplit.join('.').split('_');
      var track = { 'index' : rawTracks[i].index, 'quality' : trackNameSplit.pop()};

      if(rawTracks[i].type === 'video') {
        videoTracks.push(track);
      } else if(rawTracks[i].type === 'audio') {
        audioTracks.push(track);
      }
    }

    if(meta[1] === activeMetaData) {
      var trackInfo = meta[1].getActiveTrackInfo();
      activeKeys = {};
      activeKeys.video = trackInfo && trackInfo.get(MetaManager.Enum.Types.VIDEO) ? trackInfo.get(MetaManager.Enum.Types.VIDEO).getTrackIndex() : undefined;
      activeKeys.audio = trackInfo && trackInfo.get(MetaManager.Enum.Types.AUDIO) ? trackInfo.get(MetaManager.Enum.Types.AUDIO).getTrackIndex() : undefined;
    }

    var trackSet = { 'video' : videoTracks, 'audio': audioTracks };
    tracks.set(meta[0], trackSet);
  }

  tracks.set('active', activeKeys);
  return tracks;
};

MetaManager.prototype.buildMetaInfo = function(key, video, audio) {
  return {
    key: key,
    video: video,
    audio: audio
  };
};

module.exports = MetaManager;

MetaManager.Enum = { };
MetaManager.Enum.Types = { VIDEO: 0, AUDIO: 1 };
