const Promise   = require('bluebird');
const Events    = require('events');
const Fs        = Promise.promisifyAll(require('fs'));
const DOMParser = require('xmldom').DOMParser;

var fileSystemUtils, fileIO, log;

function WebmMetaData() { }

WebmMetaData.prototype.initialize = function() {
  if(typeof WebmMetaData.prototype.protoInit === 'undefined') {
    WebmMetaData.prototype.protoInit = true;
    Object.setPrototypeOf(WebmMetaData.prototype, Events.prototype);
    fileSystemUtils = this.factory.createFileSystemUtils();
    fileIO          = this.factory.createFileIO();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

WebmMetaData.prototype.generateWebmMeta = Promise.coroutine(function* (path) {
  log.debug("WebmMetaData.generateWebmMeta", path);
  var meta = yield Fs.readFileAsync(path);

  if(meta) {
    var tracks = parseMpdForTracks(meta);
    var dir = fileSystemUtils.splitDirFromPath(path);

    return getClusters.call(this, dir, tracks);
  }

  return Promise.reject("No meta data to get clusters from.");
});

module.exports = WebmMetaData;

var parseMpdForTracks = function(blob) {
  log.debug("WebmMetaData.parseMpdForSegments");
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

var getClusters = function(dirPath, tracks) {
  log.debug("WebmMetaData.getClusters");
  var webmParser = this.factory.createWebmParser();
  var metaRequests = [];

  for(var i in tracks) {
    var fileName    = fileSystemUtils.splitNameFromPath(tracks[i].baseUrl);
    var fileExt     = fileSystemUtils.splitExtensionFromPath(tracks[i].baseUrl);

    var metaRequest = {};
    metaRequest.path          = `${dirPath}${fileName}.${fileExt}`;
    metaRequest.onData        = parseEBML;
    metaRequest.manifest      = this.factory.createManifest();
    metaRequest.manifest.prime(`${fileName}.${fileExt}`, tracks[i].initRange.split('-'));
    metaRequests.push(metaRequest);
  }

  webmParser.on('error', function(err) {
    this.emit('error', err);
  });

  webmParser.once('end', function() {
    try {
      var metaData = [];
      for(var i = 0; i < metaRequests.length; ++i) {
        var flatManifest = metaRequests[i].manifest.flattenManifest();
        flatManifest.duration = flatManifest.clusters[1].time;
        metaData.push(flatManifest);
      }

      this.emit('end', metaData);
    } catch(err) {
      log.error("getClusters failed", err);
      this.emit('error', err);
    }
  }.bind(this));

  log.debug("Meta requests: ", metaRequests);
  webmParser.queuedDecode(metaRequests);

  return new Promise(function(resolve, reject) {
    this.once('end', resolve);
    this.once('error', reject);
  }.bind(this));
};

var parseEBML = function(manifest, data) {
  log.silly("WebmMetaData.parseEBML", data);
  var tagType = data[0];
  var tagData = data[1];
  log.silly(`tag: ${tagType}, tagStr: ${tagData.tagStr}, type: ${tagData.type}, name: ${tagData.name}, start: ${tagData.start}, end: ${tagData.end}, size: ${tagData.dataSize}`);

  if(tagType == 'start') {
    if(tagData.name == 'Cluster') {
      var cluster = manifest.createCluster();
      cluster.start = tagData.start;
      cluster.end = parseInt(tagData.end) - 1;
      manifest.addCluster(cluster);
    }
  } else if(tagType === "tag") {
    if(tagData.name === 'Timecode') {
      var cluster = manifest.getCluster(tagData.start);
      cluster.time = tagData.data.readUIntBE(0, tagData.data.length);
    } else if(tagData.name === 'Duration') {
      var duration = tagData.data.readFloatBE(0, tagData.data.length);
      manifest.setDuration(duration);
    } else if(tagData.name === 'TimecodeScale') {
      var timecodeScale = tagData.data.readUIntBE(0, tagData.data.length)
      manifest.setTimecodeScale(timecodeScale);
    }
  }
};
