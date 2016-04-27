function RequestFactory() {};

RequestFactory.buildVideoSegmentRequest = function(typeId, path, segment) {
	console.log('RequestFactory.buildVideoSegmentRequest');
	var request = new Object();
	request.typeId = typeId;
  request.path = path;
  request.segment = segment;

  return request;
};

RequestFactory.buildVideoMetaDataRequest = function(path, type) {
	console.log('RequestFactory.buildVideoMetaDataRequest');
	var request = new Object();
	request.path = path;
	return request;
};

module.exports = RequestFactory;
