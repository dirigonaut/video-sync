var log           = require('loglevel');
var SourceBuffer  = require('./SourceBuffer.js');

function MpdMeta() {
}

MpdMeta.prototype.getVideoQuality = function(manifest, index) {
  log.info('MpdMeta.selectVideoQuality');
  this.active.get(SourceBuffer.Enum.VIDEO).selected = index;
};

MpdMeta.prototype.getAudioQuality = function(manifest, index) {
  log.info('MpdMeta.selectAudioQuality');
  this.active.get(SourceBuffer.Enum.AUDIO).selected = index;
};

MpdMeta.prototype.getInit = function(manifest, typeId) {
  log.info('MpdMeta.getInit ' + typeId);
  return this._addPath(typeId, self.metaJson[self.active.get(typeId).selected].init);
};

MpdMeta.prototype.getSegment = function(manifest, typeId, timestamp) {
  log.info('MpdMeta.getSegment');
  var activeMeta = this.active.get(typeId);
  var clusters = this.metaJson[activeMeta.selected].clusters;
  var cluster = null;

  var index = this.getSegmentIndex(typeId, timestamp);
  cluster = [clusters[index].start, clusters[index].end];

  return this._addPath(typeId, cluster);
};

MpdMeta.prototype.getDuration = function(manifest, typeId, qualityIndex) {

};

MpdMeta.prototype.getBaseUrl = function(manifest, typeId, qualityIndex) {

};

MpdMeta.prototype.isLastSegment = function(manifest, typeId) {
  var activeMeta = this.active.get(typeId);
  return activeMeta.current.index < this.metaJson[activeMeta.selected].clusters.length;
};

module.exports = MpdMeta;
