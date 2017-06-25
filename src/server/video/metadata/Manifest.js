var LogManager = require('../../log/LogManager');

var log        = LogManager.getLog(LogManager.LogEnum.ENCODING);

function LinkedCluster() {
  this.next = null;
  this.prev = null;
  this.cluster = null;
}

function Manifest(path, init) {
  log.debug('Manifest', path);
  this.path = path;
  this.init = init;
  this.linkedClusters = new LinkedCluster();
}

Manifest.cluster = function() {
  var cluster = {};
  cluster.start = null;
  cluster.end = null;
  cluster.time = null;

  return cluster;
};

Manifest.setTimecodeScale = function(manifest, timecodeScale) {
  log.silly('Manifest.setTimecodeScale', timecodeScale);
  manifest.timecodeScale = timecodeScale;
};

Manifest.setDuration = function(manifest, duration) {
  log.silly('Manifest.setDuration', duration);
  manifest.duration = duration;
};

Manifest.addCluster = function(manifest, cluster) {
  log.silly('Manifest.addCluster', cluster);
  var linkedCluster = new LinkedCluster();
  linkedCluster.cluster = cluster;

  for(var pointer = manifest.linkedClusters; pointer; pointer = pointer.next) {
    if(pointer.next == null) {
      linkedCluster.prev = pointer;
      linkedCluster.cluster = cluster;

      pointer.next = linkedCluster;
      break;
    }
  }
};

Manifest.getCluster = function(manifest, position) {
  var cluster = null;

  for(var pointer = manifest.linkedClusters.next; pointer; pointer = pointer.next) {
    if(pointer.cluster.start < position && position < pointer.cluster.end) {
      cluster = pointer.cluster;
      break;
    }
  }
  return cluster;
};

Manifest.flattenManifest = function(manifest) {
  log.debug('Manifest.flattenManifest');
  var clusterList = [];

  for(var pointer = manifest.linkedClusters.next; pointer; pointer = pointer.next) {
    clusterList.push(pointer.cluster);
  }

  manifest.clusters = clusterList;
  delete manifest.linkedClusters;

  return manifest;
};

module.exports = Manifest;
