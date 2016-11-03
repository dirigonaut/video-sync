var EventEmiter = require('events').EventEmitter;
var FfprobeProcess  = require('./encoding/process/FfprobeProcess');
var Mp4Parser  = require('../encoding/parser/Mp4Parser');

function MpdUtil() {
  this.eventEmiter = new EventEmiter();
  this.eventEmitter.on('parsed', function(meta){

  });
}

MpdUtil.prototype.parseFile = function(path) {
  var self = this;
  var ffprobe = new FfprobeProcess();
  var codec = path + "pull extension off path";

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

MpdUtil.prototype.generateMpd = function(path) {
  var self = this;

  this.loadMpd(path, function(mpd) {
    var tracks self.getTracks(mpd);

    self.eventEmiter.on('finished', function(mpd) {

    });

    tracks.forEach(function(trackPath) {
      self.parseFile(trackPath);
    });
  });
};

MpdUtil.prototype.getTracks = function(mpd) {

};

MpdUtil.prototype.loadMpd = function(path, callback) {

};

MpdUtil.prototype.saveMpd = function(path, data) {

};

MpdUtil.prototype.insertMetaData = function(mpd, metaData) {

};

module.exports = MpdUtil;
