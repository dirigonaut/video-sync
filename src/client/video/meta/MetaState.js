function MetaState() { };

MetaState.prototype.initialize = function(force) {
  this.bufferIndex = 0;
  this.forceBuffer = false;

  this.bufferSegments = [];
};

MetaState.prototype.setTimeStep = function(timeStep) {
  this.timeStep = timeStep;
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
  this.bufferSegments[index] = this.trackIndex;
};

MetaState.prototype.isSegmentBuffered = function(index) {
  var isBuffered = true;
  var buffered = this.bufferSegments[index];

  if(!buffered) {
    isBuffered = false;
  } else if (this.forceBuffer) {
    if(buffered !== this.trackIndex) {
      isBuffered = false;
    }
  }

  return isBuffered;
};

MetaState.prototype.setForceBuffer = function(force) {
  this.forceBuffer = force;
};

MetaState.prototype.isForceBuffer = function() {
  return this.forceBuffer;
};

module.exports = MetaState;
