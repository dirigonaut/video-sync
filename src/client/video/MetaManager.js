const util          = require('util');
const EventEmitter  = require('events');

var ClientSocket    = require('../socket/ClientSocket.js');
var MpdMeta         = require('./meta/MpdMeta.js');
var Mp4Parser       = require('./meta/Mp4Parser.js');
var WebmParser      = require('./meta/WebmParser.js');

var clientSocket = new ClientSocket();

function MetaManager() {
  this.metaDataList   = null;
  this.activeMetaData = null;
}

util.inherits(MetaManager, EventEmitter);

MetaManager.prototype.requestMetaData = function(fileBuffer) {
  this.metaDataList = new Map();

  var _this = this;
  var addMetaData = function(header, binaryFile) {
    console.log('MetaManager.addMetaData');
    var util = null;

    if(header.type === 'webm') {
      util = new WebmParser();
    } else if(header.type === 'mp4') {
      util = new Mp4Parser();
    }

    _this.metaDataList.set(header.type, new MpdMeta(binaryFile.toString(), util));

    if(_this.activeMetaData === null) {
      _this.setActiveMetaData(header.type);
    }
  };

  clientSocket.sendRequest('get-meta-files', fileBuffer.registerRequest(addMetaData));
};

MetaManager.prototype.setActiveMetaData = function(metaKey) {
  this.activeMetaData = this.metaDataList.get(metaKey);
  this.emit('meta-data-loaded', metaKey);
};

MetaManager.prototype.setBufferThreshold = function(threshold) {
  for(var meta of this.metaDataList) {
    meta.setThreshold(threshold);
  }
};

MetaManager.prototype.getActiveMetaData = function() {
  return this.activeMetaData;
};

MetaManager.prototype.getTrackInfo = function() {
  var tracks = new Map();

  for(var meta of this.metaDataList) {
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

    var trackSet = {'video' : videoTracks, 'audio': audioTracks};
    tracks.set(meta[0], trackSet);
  }

  return tracks;
};

module.exports = MetaManager;
