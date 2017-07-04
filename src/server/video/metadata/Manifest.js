var log;

function Manifest() { }

Manifest.prototype.initialize = function(force) {
	if(typeof Manifest.prototype.protoInit === 'undefined') {
    Manifest.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }
};

Manifest.prototype.createCluster = function() {
  return {
    cluster.start,
    cluster.end,
    cluster.time
  };
};

Manifest.prototype.prime = function(path, init) {
  log.debug('Manifest.prime', path);
  this.path = path;
  this.init = init;
  this.linkedClusters = createLinkedCluster();
}

Manifest.prototype.setTimecodeScale = function(timecodeScale) {
  log.silly('Manifest.setTimecodeScale', timecodeScale);
  this.timecodeScale = timecodeScale;
};

Manifest.prototype.setDuration = function(duration) {
  log.silly('Manifest.setDuration', duration);
  this.duration = duration;
};

Manifest.prototype.addCluster = function(cluster) {
  log.silly('Manifest.addCluster', cluster);
  var linkedCluster = createLinkedCluster();
  linkedCluster.cluster = cluster;

  for(var pointer = this.linkedClusters; pointer; pointer = pointer.next) {
    if(pointer.next == null) {
      linkedCluster.prev = pointer;
      linkedCluster.cluster = cluster;

      pointer.next = linkedCluster;
      break;
    }
  }
};

Manifest.prototype.getCluster = function(position) {
  var cluster = null;

  for(var pointer = this.linkedClusters.next; pointer; pointer = pointer.next) {
    if(pointer.cluster.start < position && position < pointer.cluster.end) {
      cluster = pointer.cluster;
      break;
    }
  }

  return cluster;
};

Manifest.prototype.flattenManifest = function() {
  log.debug('Manifest.flattenManifest');
  var clusterList = [];

  for(var pointer = this.linkedClusters.next; pointer; pointer = pointer.next) {
    clusterList.push(pointer.cluster);
  }

  return {
    clusters: clusterList,
    path: this.path,
    init: this.init
  };
};

module.exports = Manifest;

function createLinkedCluster() {
  return {
    this.next,
    this.prev,
    this.cluster
  };
}
