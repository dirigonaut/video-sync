var log           = require('loglevel');
var SourceBuffer  = require('./SourceBuffer.js');

var self;

function WebmMeta(metaJson) {
  this.metaJson = metaJson;
  this.active   = new Map();

  var activeVideo = ActiveMeta();
  activeVideo.selected = 0;
  this.active.set(SourceBuffer.Enum.VIDEO, activeVideo);

  var activeAudio = ActiveMeta();
  activeAudio.selected = 1;
  this.active.set(SourceBuffer.Enum.AUDIO, activeAudio);

  self = this;
}

WebmMeta.prototype.selectVideoQuality = function(index) {
  self.active.get(SourceBuffer.Enum.VIDEO).selected = index;
};

WebmMeta.prototype.selectAudioQuality = function(index) {
  self.active.get(SourceBuffer.Enum.AUDIO).selected = index;
};

WebmMeta.prototype.getInit = function(typeId) {
  log.info('WebmMeta.getInit ' + typeId);
  return self._addPath(typeId, self.metaJson[self.active.get(typeId).selected].init);
};

WebmMeta.prototype.getNextSegment = function(typeId) {
  log.info('WebmMeta.getNextSegment');
  var activeMeta = self.active.get(typeId);
  var time = self.metaJson[activeMeta.selected].clusters[activeMeta.current.index].time;

  return self.getSegment(typeId, time, 1);
};

WebmMeta.prototype.getSegment = function(typeId, timestamp, increment) {
  log.info('WebmMeta.getSegment');
  var activeMeta = self.active.get(typeId);
  var clusters = self.metaJson[activeMeta.selected].clusters;
  var cluster = null;

  for(var i in clusters) {
    if(clusters[i].time == timestamp) {
      cluster = [clusters[i].start, clusters[i].end];
      self._updateActiveMeta(activeMeta, i, increment);
      break;
    } else if(clusters[i].time > timestamp) {
      var index = i == 0 ? i : i - 1;
      cluster = [clusters[index].start, clusters[index].end];
      self._updateActiveMeta(activeMeta, i, increment);
      break;
    }
  }

  return self._addPath(typeId, cluster);
};

WebmMeta.prototype._updateActiveMeta = function(activeMeta, clusterIndex, increment) {
  log.info('WebmMeta._updateActiveMeta');
  activeMeta.current.buffered   = true;
  activeMeta.current.index      = parseInt(clusterIndex) + parseInt(increment);
  activeMeta.next.index         = activeMeta.current.index + 1;
  activeMeta.next.buffered      = false;
};

WebmMeta.prototype.isLastSegment = function(typeId) {
  var activeMeta = self.active.get(typeId);
  return activeMeta.current.index < self.metaJson[activeMeta.selected].clusters.length;
};

WebmMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
  var activeMeta = self.active.get(typeId);
  var isReady = false;
  var curCluster = self.metaJson[activeMeta.selected].clusters[activeMeta.current.index];

  if(curCluster == null || curCluster == undefined) {
    isReady = true;
  } else {
    if((curCluster.time - activeMeta.threshold < currentTime * 1000) && !activeMeta.next.buffered) {
      isReady = true;
      activeMeta.next.buffered = true;
    }
  }

  return isReady;
};

WebmMeta.prototype._addPath = function(typeId, cluster) {
  return [self.metaJson[self.active.get(typeId).selected].path, cluster];
};

module.exports = WebmMeta;

function ActiveMeta() {
  var activeMeta            = new Object();

  activeMeta.selected       = null;
  activeMeta.timeStep       = 6000;
  activeMeta.threshold      = activeMeta.timeStep / 2;

  activeMeta.current        = new Object();
  activeMeta.current.index  = 0;

  activeMeta.next           = new Object();
  activeMeta.next.index     = activeMeta.current.index + 1;

  return activeMeta;
};
