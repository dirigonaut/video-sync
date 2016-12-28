function MetaState(timeStep) {
  this.timeStep    = timeStep;
  this.bufferIndex = 0;
  this.forceBuffer = false;

  this.bufferSegments = [];
};

MetaState.prototype.setTrackIndex = function(trackIndex) {
  this.trackIndex = trackIndex;
};

MetaState.prototype.getTrackIndex = function() {
  return this.trackIndex;
};

MetaState.prototype.setAdaptSetIndex = function(adaptIndex) {
  this.adaptIndex = adaptIndex;
};

MetaState.prototype.getAdaptSetIndex = function() {
  return this.adaptIndex;
};

MetaState.prototype.setSegmentBuffered = function(index) {
  console.log(`MetaState.prototype.setSegmentBuffered | index: ${index}`);
  this.bufferSegments[index] = true;
};

MetaState.prototype.isSegmentBuffered = function(index) {
  return this.bufferSegments[index] !== undefined ? this.bufferSegments[index] && !this.forceBuffer : false;
};

MetaState.prototype.setForceBuffer = function(force) {
  this.forceBuffer = force;
};

module.exports = MetaState;
