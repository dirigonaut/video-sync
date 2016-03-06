var DOMParser     = require('xmldom').DOMParser;
var Ebml          = require('ebml');

var VideoStream   = require('./VideoStream');
var Manifest   = require('./Manifest');

var self;

function WebmMetaData() {
  self = this;
};

//Load the mpd file into memory
WebmMetaData.prototype.generateMetaData = function(request) {
  console.log("WebmMetaData.generateMetaData");
  var buffer = [];

  var readConfig = VideoStream.streamConfig(request.data.path, function(data) {
      buffer.push(data);
  });

  readConfig.onFinish = function() {
    self._parseMpd(request, Buffer.concat(buffer), readConfig.path);
  }

  VideoStream.read(readConfig);
};

WebmMetaData.prototype._parseMpd = function(request, blob, path) {
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
    var segment = new Object();
    segment.baseUrl   = adaptSets[i].getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
    segment.type      = adaptSets[i].getAttribute('mimeType');
    segment.initRange = adaptSets[i].getElementsByTagName('Initialization').item(0).getAttribute('range');

    segments.push(segment);
  }

  self._getClusters(request, segments);
};

WebmMetaData.prototype._getClusters = function(request, segments) {
  console.log("WebmMetaData._getClusters");

  var metaRequests = [];
  for(var i in segments) {
    var metaRequest = new Object();

    var splitPath = request.data.path.split('/');
    var dirPath = request.data.path.replace(splitPath[splitPath.length - 1], '');

    var readConfig = VideoStream.streamConfig(dirPath + segments[i].baseUrl, self._parseEBML)

    metaRequest.manifest = new Manifest(readConfig.path, segments[i].initRange.split('-'));
    metaRequest.readConfig = readConfig;
    metaRequests.push(metaRequest);
  }

  var stream = new VideoStream();

  stream.on('end', function(manifest) {
    self._saveMetaData(request, metaRequests);
  });

  stream.queuedDecode(metaRequests);
};

WebmMetaData.prototype._parseEBML = function(manifest, data) {
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

WebmMetaData.prototype._saveMetaData = function(request, metaRequests) {
  console.log("WebmMetaData._saveMetaData");
  var metaData = [];

  for(var i in metaRequests) {
    metaData.push(Manifest.flattenManifest(metaRequests[i].manifest));
  }

  var splitPath = request.data.path.split('/');
  var dirPath = request.data.path.replace(splitPath[splitPath.length - 1], '');

  var writeConfig = VideoStream.streamConfig(dirPath + "webmMeta.json", null, function() {
      request.socket.emit("file-generated");
  });

  VideoStream.write(writeConfig, JSON.stringify(metaData));
};

module.exports = WebmMetaData;
