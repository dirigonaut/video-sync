function ClientUtils() {}

ClientUtils.prototype.getNewMediaSourceObject = function() {
	console.log('ClientUtils.getMediaSourceObject');
  return new MediaSource();
};
