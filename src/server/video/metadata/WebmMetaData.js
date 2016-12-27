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
    var tracks = parseMpdForTracks(Buffer.concat(buffer));
    getClusters(fileUtil.splitDirFromPath(path), tracks, callback);
  }

  videoStream.read(readConfig);
}

module.exports = WebmMetaData;

var parseMpdForTracks = function(blob) {
  console.log("WebmMetaData.parseMpdForSegments");
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

  var tracks = [];
  for(var i in adaptSets) {
    var repSets = adaptSets[i].getElementsByTagName('Representation');

    for(var j = 0; j < repSets.length; ++j) {
      var track = {};
      track.baseUrl   = repSets.item(j).getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
      track.initRange = repSets.item(j).getElementsByTagName('Initialization').item(0).getAttribute('range');
      track.type      = adaptSets[i].getAttribute('mimeType');

      tracks.push(track);
    }
  }

  return tracks;
};

var getClusters = function(dirPath, tracks, callback) {
  console.log("WebmMetaData._getClusters");
  var webmParser = new WebmParser();
  var metaRequests = [];

  for(var i in tracks) {
    var metaRequest = new Object();
    var fileName = fileUtil.splitNameFromPath(tracks[i].baseUrl);
    var fileExt  = fileUtil.splitExtensionFromPath(tracks[i].baseUrl);
    var readConfig = VideoStream.createStreamConfig(`${dirPath}${fileName}.${fileExt}`, parseEBML);

    metaRequest.manifest = new Manifest(`${fileName}.${fileExt}`, tracks[i].initRange.split('-'));
    metaRequest.readConfig = readConfig;
    metaRequests.push(metaRequest);
  }

  webmParser.on('end', function() {
    var metaData = [];
    for(var i in metaRequests) {
      var flatManifest = Manifest.flattenManifest(metaRequests[i].manifest);
      flatManifest.duration = flatManifest.clusters[1].time;
      metaData.push(flatManifest);
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
    } else if(tagData.name === 'Duration') {
      var duration = tagData.data.readFloatBE(0, tagData.data.length);
      console.log(`Duration: ${duration/1000}`);
      Manifest.setDuration(manifest, duration);
    } else if(tagData.name === 'TimecodeScale') {
      var timecodeScale = tagData.data.readUIntBE(0, tagData.data.length)
      Manifest.setTimecodeScale(manifest, timecodeScale);
    }
  }

  return true;
};
