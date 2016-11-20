var log           = require('loglevel');
var SourceBuffer  = require('./SourceBuffer.js');

var self;

function MetaManager(metaJson) {

}

MetaManager.prototype.addEncodingType = function(meta) {
  log.info('MetaManager.selectVideoQuality');
  self.active.get(SourceBuffer.Enum.VIDEO).selected = index;
};

MetaManager.prototype.selectEncodingType = function(index) {
  log.info('MetaManager.selectVideoQuality');
  self.active.get(SourceBuffer.Enum.VIDEO).selected = index;
};

MetaManager.prototype.selectVideoQuality = function(index) {
  log.info('MetaManager.selectVideoQuality');
  self.active.get(SourceBuffer.Enum.VIDEO).selected = index;
};

MetaManager.prototype.selectAudioQuality = function(index) {
  log.info('MetaManager.selectAudioQuality');
  self.active.get(SourceBuffer.Enum.AUDIO).selected = index;
};

MetaManager.prototype.getInit = function(typeId) {
  log.info('MetaManager.getInit ' + typeId);
  return self._addPath(typeId, self.metaJson[self.active.get(typeId).selected].init);
};

MetaManager.prototype.getNextSegment = function(typeId) {
  log.info('MetaManager.getNextSegment');
  var activeMeta = self.active.get(typeId);
  var time = self.metaJson[activeMeta.selected].clusters[activeMeta.next.index].time;

  return self.getSegment(typeId, time);
};

MetaManager.prototype.getSegment = function(typeId, timestamp) {
  log.info('MetaManager.getSegment');
  var activeMeta = self.active.get(typeId);
  var clusters = self.metaJson[activeMeta.selected].clusters;
  var cluster = null;

  var index = self.getSegmentIndex(typeId, timestamp);
  cluster = [clusters[index].start, clusters[index].end];

  return self._addPath(typeId, cluster);
};

MetaManager.prototype.updateActiveMeta = function(typeId, clusterIndex) {
  log.info('MetaManager.updateActiveMeta');
  var activeMeta = self.active.get(typeId);

  if(clusterIndex != activeMeta.current.index) {
    activeMeta.current.index = parseInt(clusterIndex);
    activeMeta.next.index    = activeMeta.current.index + 1;
    activeMeta.next.buffered = false;
  }
};

MetaManager.prototype.isLastSegment = function(typeId) {
  var activeMeta = self.active.get(typeId);
  return activeMeta.current.index < self.metaJson[activeMeta.selected].clusters.length;
};

MetaManager.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  var activeMeta = self.active.get(typeId);
  var index = self.getSegmentIndex(typeId, currentTime * 1000);

  if(index != null) {
    var curCluster = self.metaJson[activeMeta.selected].clusters[index];
    var isReady = false;

    if((curCluster.time + activeMeta.threshold < currentTime * 1000) && !activeMeta.next.buffered) {
      isReady = true;
      activeMeta.next.buffered = true;
    }

    if(index == activeMeta.next.index) {
      activeMeta.current.index = activeMeta.next.index;
      activeMeta.next.index    = activeMeta.current.index + 1;
      activeMeta.next.buffered = false;
    }
  }

  return isReady;
};

MetaManager.prototype.getActiveMeta = function(typeId) {
  return self.active.get(typeId);
};

MetaManager.prototype._addPath = function(typeId, cluster) {
  return [self.metaJson[self.active.get(typeId).selected].path, cluster];
};

module.exports = MetaManager;
