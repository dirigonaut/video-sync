var DOMParser       = require('xmldom').DOMParser;
var VideoStream     = require('../VideoStream');
var WebmParser      = require('./parser/WebmParser');
var Manifest        = require('./Manifest');
var Log             = require('../../utils/Logger');
var FileUtil        = require('../../utils/FileSystemUtils');

var fileUtil = new FileUtil();

function WebmMetaData() {

}

WebmMetaData.prototype.generateWebmMeta = function(path, callback) {
  console.log("WebmMetaData.generateWebmMeta");
  var videoStream = new VideoStream();
  var buffer = [];

  var readConfig = videoStream.createStreamConfig(path, function(data) {
      buffer.push(data);
  });

  readConfig.onFinish = function() {
    var segments = parseMpdForSegments(Buffer.concat(buffer));
    getClusters(fileUtil.splitDirFromPath(path), segments, callback);
  }

  videoStream.read(readConfig);
}

module.exports = WebmMetaData;

var parseMpdForSegments = function(blob) {
  console.log("WebmMetaData._parseMpd");
  var mpd = new DOMParser().parseFromString(blob.toString(), "text/xml");
  var period = mpd.documentElement.getElementsByTagName('Period');
  var elements = period.item(0).childNodes;
  var initSegments = new Map();

  var adaptSets = [];
  for(var i in elements){
    if(elements[i].tagName == 'AdaptationSet') {
      adaptSets.push(elements[i]);
    }
  }

  var segments = []
  for(var i in adaptSets) {
    var segment = {};
    segment.baseUrl   = adaptSets[i].getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
    segment.type      = adaptSets[i].getAttribute('mimeType');
    segment.initRange = adaptSets[i].getElementsByTagName('Initialization').item(0).getAttribute('range');

    segments.push(segment);
  }

  return segments;
};

var getClusters = function(dirPath, segments, callback) {
  console.log("WebmMetaData._getClusters");
  var webmParser = new WebmParser();
  var metaRequests = [];

  for(var i in segments) {
    var metaRequest = new Object();
    var fileName = fileUtil.splitNameFromPath(segments[i].baseUrl);
    var fileExt  = fileUtil.splitExtensionFromPath(segments[i].baseUrl);
    var readConfig = VideoStream.createStreamConfig(`${dirPath}${fileName}.${fileExt}`, parseEBML);

    metaRequest.manifest = new Manifest(`${fileName}.${fileExt}`, segments[i].initRange.split('-'));
    metaRequest.readConfig = readConfig;
    metaRequests.push(metaRequest);
  }

  webmParser.on('end', function() {
    var metaData = [];
    for(var i in metaRequests) {
      metaData.push(Manifest.flattenManifest(metaRequests[i].manifest));
    }

    callback(metaData);
  });

  webmParser.queuedDecode(metaRequests);
};

var parseEBML = function(manifest, data) {
  //console.log("WebmMetaData._parseCue");
  var tagType = data[0];
  var tagData = data[1];

  if(tagType == "start") {
    if(tagData.name == 'Cluster') {
      var cluster = Manifest.cluster();
      cluster.start = tagData.start;
      cluster.end = parseInt(tagData.end) - 1;
      Manifest.addCluster(manifest, cluster);
    }
  } else if(tagType == "tag") {
    if(tagData.name == 'Timecode') {
      var cluster = Manifest.getCluster(manifest, tagData.start);
      cluster.time = tagData.data.readUIntBE(0, tagData.data.length);
    }
  }

  return true;
};
