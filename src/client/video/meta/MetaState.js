function MetaState(index, timeStep) {
  this.trackIndex     = index;
  this.timeStep       = timeStep;

  this.current  = 0;
  this.next     = 1;

  this.bufferSegments = [];
};

MetaState.prototype.isSegmentBuffered = function(index) {
  return this.bufferSegments[index] !== undefined ? this.bufferSegments[index] : false;
};

MetaState.prototype.setSegmentBuffered = function(index) {
  console.log(`MetaState.prototype.setSegmentBuffered | index: ${index}`);
  this.bufferSegments[index] = true;
};

module.exports = MetaState;
