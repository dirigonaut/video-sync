var log           = require('loglevel');
var SourceBuffer  = require('../SourceBuffer.js');

var self;

function WebmMeta(metaJson) {
  this.metaJson = metaJson;
  this.active   = new Map();

  var activeVideo = ActiveMeta();
  activeVideo.selected = 0;
  activeVideo.timeStep = parseInt(this.metaJson[activeVideo.selected].clusters[1].time) - parseInt(this.metaJson[activeVideo.selected].clusters[0].time);
  activeVideo.threshold = activeVideo.timeStep / 2;
  this.active.set(SourceBuffer.Enum.VIDEO, activeVideo);

  var activeAudio = ActiveMeta();
  activeAudio.selected = 1;
  activeAudio.timeStep = parseInt(this.metaJson[activeAudio.selected].clusters[1].time) - parseInt(this.metaJson[activeAudio.selected].clusters[0].time);
  activeAudio.threshold = activeAudio.timeStep / 2;
  this.active.set(SourceBuffer.Enum.AUDIO, activeAudio);

  self = this;
}

WebmMeta.prototype.selectVideoQuality = function(index) {
  log.info('WebmMeta.selectVideoQuality');
  self.active.get(SourceBuffer.Enum.VIDEO).selected = index;
};

WebmMeta.prototype.selectAudioQuality = function(index) {
  log.info('WebmMeta.selectAudioQuality');
  self.active.get(SourceBuffer.Enum.AUDIO).selected = index;
};

WebmMeta.prototype.getInit = function(typeId) {
  log.info('WebmMeta.getInit ' + typeId);
  return self._addPath(typeId, self.metaJson[self.active.get(typeId).selected].init);
};

WebmMeta.prototype.getNextSegment = function(typeId) {
  log.info('WebmMeta.getNextSegment');
  var activeMeta = self.active.get(typeId);
  var time = self.metaJson[activeMeta.selected].clusters[activeMeta.next.index].time;

  return self.getSegment(typeId, time);
};

WebmMeta.prototype.getSegment = function(typeId, timestamp) {
  log.info('WebmMeta.getSegment');
  var activeMeta = self.active.get(typeId);
  var clusters = self.metaJson[activeMeta.selected].clusters;
  var cluster = null;

  var index = self.getSegmentIndex(typeId, timestamp);
  cluster = [clusters[index].start, clusters[index].end];

  return self._addPath(typeId, cluster);
};

WebmMeta.prototype.getSegmentIndex = function(typeId, timestamp) {
  var activeMeta = self.active.get(typeId);
  var clusters = self.metaJson[activeMeta.selected].clusters;
  var clusterIndex = null;

  if(timestamp == 0) {
      clusterIndex = 0;
  } else {
    for(var i in clusters) {
      if(clusters[i].time == timestamp) {
        clusterIndex = parseInt(i);
        break;
      } else if (clusters[i].time > timestamp) {
        clusterIndex = parseInt(i) - 1;
        break;
      } else {
        clusterIndex = parseInt(i);
      }
    }
  }

  return clusterIndex;
};

WebmMeta.prototype.updateActiveMeta = function(typeId, clusterIndex) {
  log.info('WebmMeta.updateActiveMeta');
  var activeMeta = self.active.get(typeId);

  if(clusterIndex != activeMeta.current.index) {
    activeMeta.current.index = parseInt(clusterIndex);
    activeMeta.next.index    = activeMeta.current.index + 1;
    activeMeta.next.buffered = false;
  }
};

WebmMeta.prototype.isLastSegment = function(typeId) {
  var activeMeta = self.active.get(typeId);
  return activeMeta.current.index < self.metaJson[activeMeta.selected].clusters.length;
};

WebmMeta.prototype.isReadyForNextSegment = function(typeId, currentTime) {
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

WebmMeta.prototype.getActiveMeta = function(typeId) {
  return self.active.get(typeId);
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
  activeMeta.next.buffered  = false;

  return activeMeta;
};
