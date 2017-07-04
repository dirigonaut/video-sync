const Promise   = require('bluebird');
const Events    = require('events');
const Fs        = Promise.promisifyAll(require('fs'));
const DOMParser = require('xmldom').DOMParser;

var fileSystemUtils, log;

function WebmMetaData() { }

WebmMetaData.prototype.initialize = function(force) {
  if(typeof WebmMetaData.prototype.protoInit === 'undefined') {
    WebmMetaData.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof WebmMetaData.prototype.stateInit === 'undefined' : force) {
    WebmMetaData.prototype.stateInit = true;
    Object.assign(this.prototype, Events.prototype);
    fileSystemUtils  = this.factory.createFileSystemUtils();
  }
};

WebmMetaData.prototype.generateWebmMeta = Promise.coroutine(function* (path) {
  log.debug("WebmMetaData.generateWebmMeta", path);
  var meta = yield Fs.readFileAsync(path);

  var tracks = parseMpdForTracks(meta);
  var dir = fileSystemUtils.splitDirFromPath(path);

  return getClusters.call(this, dir, tracks);
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

var getClusters = Promise.coroutine(function* (dirPath, tracks) {
  log.debug("WebmMetaData.getClusters");
  var webmParser = this.factory.createWebmParser();
  var metaRequests = [];

  for(var i in tracks) {
    var metaRequest = {};
    var fileName    = fileSystemUtils.splitNameFromPath(tracks[i].baseUrl);
    var fileExt     = fileSystemUtils.splitExtensionFromPath(tracks[i].baseUrl);
    var readConfig  = FileIO.createStreamConfig(`${dirPath}${fileName}.${fileExt}`, parseEBML);

    metaRequest.manifest      = this.factory.createManifest();
    metaRequest.manifest.path = `${fileName}.${fileExt}`;
    metaRequest.manifest.init = tracks[i].initRange.split('-');
    metaRequest.readConfig    = readConfig;
    metaRequests.push(metaRequest);
  }

  webmParser.on('error', function(err) {
    this.emit('error', err);
  });

  webmParser.on('end', function() {
    var metaData = [];
    for(var i in metaRequests) {
      var flatManifest = metaRequests[i].manifest.flattenManifest();
      flatManifest.duration = flatManifest.clusters[1].time;
      metaData.push(flatManifest);
    }

    this.emit('end', metaData);
  });

  log.debug("Meta requests: ", metaRequests);
  webmParser.queuedDecode(metaRequests);

  return new Promise(function(resolve, reject) {
    this.once('end', resolve);
    this.once('error', reject);
  });
});

var parseEBML = function(manifest, data) {
  log.silly("WebmMetaData.parseEBML", data);
  var tagType = data[0];
  var tagData = data[1];

  if(tagType == "start") {
    if(tagData.name == 'Cluster') {
      var cluster = manifest.createCluster();
      cluster.start = tagData.start;
      cluster.end = parseInt(tagData.end) - 1;
      manifest.addCluster(cluster);
    }
  } else if(tagType == "tag") {
    if(tagData.name == 'Timecode') {
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
