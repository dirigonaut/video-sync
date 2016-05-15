function LinkedCluster() {
  this.next = null;
  this.prev = null;
  this.cluster = null;
}

function Manifest(path, init) {
  console.log('Manifest');
  this.path = path;
  this.init = init;
  this.linkedClusters = new LinkedCluster();
}

Manifest.cluster = function() {
  var cluster = new Object();
  cluster.start = null;
  cluster.end = null;
  cluster.time = null;

  return cluster;
};

Manifest.addCluster = function(manifest, cluster) {
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
  console.log('Manifest.flattenManifest');
  var clusterList = [];

  for(var pointer = manifest.linkedClusters.next; pointer; pointer = pointer.next) {
    clusterList.push(pointer.cluster);
  }

  manifest.clusters = clusterList;
  delete manifest.linkedClusters;

  return manifest;
};

module.exports = Manifest;
