var EventEmiter = require('events').EventEmitter;
var DOMParser   = require('xmldom').DOMParser;

var FfprobeProcess  = require('./encoding/process/FfprobeProcess');
var Mp4Parser  = require('../encoding/parser/Mp4Parser');
var VideoStream = require('../VideoStream');
var FileUtils = require('../../utils/FileSystemUtils');

var fileUtils = new FileUtils;

function MpdUtil() {
  var self = this;

  this.xmlMap = {};
  this.mpd = null;
  this.trackCount = 0;

  this.eventEmiter = new EventEmiter();
  this.eventEmitter.on('parsed', function(meta){
    self.xmlMap.set(meta[0], meta[1]);
    self.trackCount -= 1;

    if(self.trackCount <= 0) {
      self.insertMetaData(self.mpd, self.xmlMap);
      self.saveMpd(self.mpd);
    }
  });
}

MpdUtil.prototype.generateMpd = function(path, callback) {
  var self = this;

  this.loadMpd(path, function(mpd) {
    self.mpd = mpd;

    var tracks = self.getTracks(mpd);
    self.trackCount = tracks.length - 1;

    tracks.forEach(function(trackPath) {
      self.parseFile(fileUtils.splitDirFromPath(path) + trackPath);
    });
  });

  this.eventEmitter.on('finished', callback);
};

MpdUtil.prototype.parseFile = function(path) {
  var self = this;
  var ffprobe = new FfprobeProcess();
  var codec = fileUtils.splitExtensionFromPath(path);

  ffprobe.on('finished', function(json) {
    if(codec == "mp4") {
      var mp4Parser = new Mp4Parser();
      var segments = mp4Parser.getSegments(json);
      var xml = mp4Parser.formatSegments(segments);

      self.eventEmiter.emit('parsed', [path, xml]);
    } else if(codec == "webm") {

    }
  });

  ffprobe.process(path);
};

MpdUtil.prototype.loadMpd = function(path, callback) {
  var fileStream = new VideoStream();
  var buffer = [];

  var bufferData = function(data) {
    buffer.push(data);
  };

  var readConfig = fileStream.createStreamConfig(path, bufferData);
  readConfig.onFinish(function() {
    var file = Buffer.concat(buffer);
    var mpd = new DOMParser().parseFromString(file.toString(), "text/xml");
    callback(mpd);
  });

  fileStream.read(readConfig);
};

MpdUtil.prototype.getTracks = function(mpd) {
  var adaptionSets = mpd.documentElement.getElementsByTagName('AdaptationSet');
  var tracks = [];

  for(var i in adaptionSets) {
    var track = adaptionSets[i].getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
    tracks.push(track);
  }

  return tracks;
};

MpdUtil.prototype.saveMpd = function(path) {
  var self = this;

  var fileStream = new VideoStream();
  var writeConfig = fileStream.createStreamConfig(path, null);

  writeConfig.onFinish(function() {
    self.eventEmiter.emit('finished');
  });

  fileStream.write(writeConfig, path);
};

MpdUtil.prototype.insertMetaData = function(mpd, metaData) {
  var doc = new DOMParser().parseFromString(mpd);
  var adaptionSets = mpd.documentElement.getElementsByTagName('AdaptationSet');
  var representationMap = new Map();

  for(var i in adaptionSets) {
    var id = adaptionSets[i].getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
    var track = adaptionSets[i].getElementsByTagName('Representation').item(0);
    representationMap.set(id, track);
  }

};

module.exports = MpdUtil;
