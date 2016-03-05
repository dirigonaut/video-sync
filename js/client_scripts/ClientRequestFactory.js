function ClientRequestFactory() {};

ClientRequestFactory.buildVideoSegmentRequest = function(path, segment) {
	console.log('ClientRequestFactory.buildVideoSegmentRequest');
	var request = new Object();
  request.path = path;
  request.segment = segment;

  return request;
};

ClientRequestFactory.buildVideoMetaDataRequest = function(path, type) {
	console.log('ClientRequestFactory.buildVideoMetaDataRequest');
	var request = new Object();
	request.path = path;
	return request;
};

module.exports = ClientRequestFactory;
