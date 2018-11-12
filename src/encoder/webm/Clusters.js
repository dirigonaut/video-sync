var log;

function Clusters() { }

Clusters.prototype.initialize = function() {
	if(typeof Clusters.prototype.protoInit === "undefined") {
    Clusters.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

Clusters.prototype.createCluster = function() {
  return {
    start: undefined,
    end: undefined,
    time: undefined,
  };
};

Clusters.prototype.prime = function(path, init) {
  log.debug("Clusters.prime", path);
  this.path = path;
  this.init = init;
  this.linkedClusters;
}

Clusters.prototype.setTimecodeScale = function(timecodeScale) {
  log.silly("Clusters.setTimecodeScale", timecodeScale);
  this.timecodeScale = timecodeScale;
};

Clusters.prototype.setDuration = function(duration) {
  log.silly("Clusters.setDuration", duration);
  this.duration = duration;
};

Clusters.prototype.addCluster = function(cluster) {
  log.silly("Clusters.addCluster", cluster);
  var linkedCluster = createLinkedCluster();
  linkedCluster.cluster = cluster;

	var last;
  for(var pointer = this.linkedClusters; pointer; pointer = pointer.next) {
    if(!pointer.next) {
			last = pointer;
      break;
    }
  }

	if(!last && !this.linkedClusters) {
		linkedCluster.prev = "head";
		this.linkedClusters = linkedCluster;
	} else if(last) {
		linkedCluster.prev = last;
		last.next = linkedCluster;
	}
};

Clusters.prototype.getCluster = function(position) {
  var cluster;

  for(var pointer = this.linkedClusters; pointer; pointer = pointer.next) {
    if(pointer.cluster.start < position && position < pointer.cluster.end) {
      cluster = pointer.cluster;
      break;
    }
  }

  return cluster;
};

Clusters.prototype.flatten = function() {
  log.debug("Clusters.flatten");
  var clusterList = [];

  for(var pointer = this.linkedClusters; pointer; pointer = pointer.next) {
    clusterList.push(pointer.cluster);
  }

  return {
    clusters: clusterList,
    path: this.path,
    init: this.init
  };
};

module.exports = Clusters;

function createLinkedCluster() {
  return {
    next: undefined,
    prev: undefined,
    cluster: undefined,
  };
}
