var log = require('loglevel');

var self;

function WebmMeta(metaJson) {
  this.metaJson       = metaJson;
  this.selected       = 0;
  this.timeStep       = 6000;
  this.threshold      = this.timeStep / 2;

  this.current        = new Object();
  this.current.index  = 0;

  this.next           = new Object();
  this.next.index     = this.current.index + 1;

  self = this;
}

WebmMeta.prototype.selectQuality = function(index) {
  self.selected = index;
}

WebmMeta.prototype.getInit = function() {
  log.info('WebmMeta.getInit');
  log.info(self.metaJson[0]);
  return self._addPath(self.metaJson[self.selected].init);
};

WebmMeta.prototype.getNextSegment = function() {
  log.info('WebmMeta.getNextSegment');
  var time = self.metaJson[self.selected].clusters[self.next.index].time

  return self.getSegment(time);
};

WebmMeta.prototype.getSegment = function(timestamp) {
  log.info('WebmMeta.getSegment');
  var clusters = self.metaJson[self.selected].clusters;
  var cluster = null;

  for(var i in clusters) {
    if(clusters[i].time == timestamp) {
      cluster = [clusters[i].start, clusters[i].end];
      break;
    } else if(clusters[i].time > timestamp) {
      cluster = [clusters[i-1].start, clusters[i-1].end];
      break;
    }
  }

  return self._addPath(cluster);
};

WebmMeta.prototype.isLastSegment = function() {
  return self.current.index < self.metaJson[self.selected].clusters.length -1;
};

WebmMeta.prototype.isReadyForNextSegment = function(currentTime) {
  var isReady = false;
  var nextCluster = self.metaJson[self.selected].clusters[self.next.index];

  if((nextCluster.time - self.threshold < currentTime * 1000) && !self.next.buffered) {
    isReady = true;
    self.next.buffered = true;
  }

  if(nextCluster.time < currentTime * 1000) {
    self.current.index  = self.next.index;
    self.next.index     = self.current.index + 1;
    self.next.buffered  = false;
  }

  return isReady;
};

WebmMeta.prototype._addPath = function(cluster) {
  return [self.metaJson[self.selected].path, cluster];
};

module.exports = WebmMeta;
