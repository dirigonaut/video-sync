const EventEmitter  = require('events');

var DOMParser       = require('xmldom').DOMParser;
var Ebml            = require('ebml');
var VideoStream     = require('../VideoStream');
var Manifest        = require('./Manifest');
var Logger          = require('../utils/Logger');

var log = new Logger();

function WebmMetaData() {
  var self = {};
  var dirPath = "";

  self.proc = new EventEmitter();
  self.on = self.proc.on.bind(self.proc);

  self._parseMpd = function(blob) {
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

    self._getClusters(segments);
  };

  self._getClusters = function(segments) {
    console.log("WebmMetaData._getClusters");
    var videoStream = new VideoStream();
    var metaRequests = [];

    for(var i in segments) {
      var metaRequest = new Object();
      console.log(dirPath + segments[i].baseUrl);
      var readConfig = videoStream.createStreamConfig(dirPath + segments[i].baseUrl, self._parseEBML);

      metaRequest.manifest = new Manifest(segments[i].baseUrl, segments[i].initRange.split('-'));
      metaRequest.readConfig = readConfig;
      metaRequests.push(metaRequest);
    }

    videoStream.on('end', function(manifest) {
      self._saveMetaData(metaRequests);
    });

    videoStream.queuedDecode(metaRequests);
  };

  self._parseEBML = function(manifest, data) {
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

  self._saveMetaData = function(metaRequests) {
    console.log("WebmMetaData._saveMetaData");
    var videoStream = new VideoStream();
    var metaData = [];

    for(var i in metaRequests) {
      metaData.push(Manifest.flattenManifest(metaRequests[i].manifest));
    }

    var writeConfig = videoStream.createStreamConfig(dirPath + "webmMeta.json", null, function() {
        self.emit('finished');
    });

    videoStream.write(writeConfig, JSON.stringify(metaData));
  };

  self._setDir = function(path) {
    var splitPath = path.split('/');
    dirPath = path.replace(splitPath[splitPath.length - 1], '');
  }

  self.generateMetaData = function(path) {
    console.log("WebmMetaData.generateMetaData");
    var videoStream = new VideoStream();
    var buffer = [];

    var readConfig = videoStream.createStreamConfig(path, function(data) {
        buffer.push(data);
    });

    readConfig.onFinish = function() {
      self._setDir(path);
      self._parseMpd(Buffer.concat(buffer));
    }

    videoStream.read(readConfig);
  };

  return self;
}

module.exports = WebmMetaData;
