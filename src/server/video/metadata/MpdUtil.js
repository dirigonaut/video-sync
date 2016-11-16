var DOMParser   = require('xmldom').DOMParser;

var VideoStream = require('../VideoStream');
var FileUtil = require('../../utils/FileSystemUtils');

var fileUtil = new FileUtil();

function MpdUtil() { }

MpdUtil.prototype.addSegmentsToMpd = function(path, metaMap, callback) {
  var processMpd = function(mpd) {
    insertMetaData(mpd, metaMap);
    cleanMpdPaths(mpd);
    saveMpd(path, mpd, callback);
  };

  loadMpd(path, processMpd);
};

MpdUtil.prototype.removeFullPathsFromMpd = function(path) {
  var processMpd = function(mpd) {
    cleanMpdPaths(mpd);
    saveMpd(path, mpd, callback);
  };

  loadMpd(path, processMpd);
};

module.exports = MpdUtil;

var loadMpd = function(path, callback) {
  var fileStream = new VideoStream();
  var buffer = [];

  var bufferData = function(data) {
    buffer.push(data);
  };

  var readConfig = fileStream.createStreamConfig(path, bufferData);
  readConfig.onFinish = function() {
    var file = Buffer.concat(buffer);
    var mpd = new DOMParser().parseFromString(file.toString(), "text/xml");
    callback(mpd);
  };

  fileStream.read(readConfig);
};

var saveMpd = function(path, callback) {
  var fileStream = new VideoStream();
  var writeConfig = fileStream.createStreamConfig(path, null);

  writeConfig.onFinish = function() {
    callback();
  };

  fileStream.write(writeConfig, path);
};

var insertMetaData = function(mpd, metaData) {
  var adaptionSets = mpd.documentElement.getElementsByTagName('AdaptationSet');
  var representationMap = new Map();

  for(var i in adaptionSets) {
    var id = adaptionSets[i].getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
    var track = adaptionSets[i].getElementsByTagName('Representation').item(0);
    representationMap.set(id, track);
  }

  console.log(representationMap);
};

var cleanMpdPaths = function(mpd) {
  return mpd;
};
