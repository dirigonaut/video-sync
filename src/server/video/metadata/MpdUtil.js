var XmlDom   = require('xmldom');

var VideoStream = require('../VideoStream');
var FileUtil = require('../../utils/FileSystemUtils');

var fileUtil = new FileUtil();

function MpdUtil() { }

MpdUtil.prototype.addSegmentsToMpd = function(path, metaMap, callback) {
  var processMpd = function(mpd) {
    insertMetaData(mpd, metaMap);
    cleanMpdPaths(mpd);

    var XMLSerializer = XmlDom.XMLSerializer;
    var text = new XMLSerializer().serializeToString(mpd);
    saveMpd(path, text, callback);
  };

  loadMpd(path, processMpd);
};

MpdUtil.prototype.removeFullPathsFromMpd = function(path) {
  var processMpd = function(mpd) {
    cleanMpdPaths(mpd);

    var XMLSerializer = XmlDom.XMLSerializer;
    var text = new XMLSerializer().serializeToString(mpd);
    saveMpd(path, text, callback);
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
    var DomParser = XmlDom.DOMParser;
    var mpd = new DomParser().parseFromString(file.toString(), "text/xml");
    callback(mpd);
  };

  fileStream.read(readConfig);
};

var saveMpd = function(path, mpd, callback) {
  var fileStream = new VideoStream();
  var writeConfig = fileStream.createStreamConfig(path, null);

  writeConfig.onFinish = function() {
    callback();
  };

  fileStream.write(writeConfig, mpd);
};

var insertMetaData = function(mpd, metaData) {
  var adaptionSets = mpd.documentElement.getElementsByTagName('AdaptationSet');
  var representationMap = new Map();

  for(var i = 0; i < adaptionSets.length; ++i) {
    var id = adaptionSets[i].getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
    var track = adaptionSets[i].getElementsByTagName('Representation').item(0);
    var base = track.getElementsByTagName('SegmentBase').item(0);
    track.removeChild(base);
    representationMap.set(id, track);
  }

  for(var key of metaData.keys()) {
    var meta = representationMap.get(key);
    if(meta !== undefined && meta !== null) {
      meta.appendChild(metaData.get(key));
    }
  }
};

var cleanMpdPaths = function(mpd) {
  return mpd;
};
