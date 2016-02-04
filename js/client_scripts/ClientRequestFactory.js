function ClientRequestFactory() {};

ClientRequestFactory.buildVideoRequest = function(path, segment) {
	var request = new Object();
  request.path = path;
  request.segment = segment;

  return request;
};

ClientRequestFactory.buildMpdFileRequest = function(path) {
	var request = new Object();
	request.path = path;

	return request;
};

module.exports = ClientRequestFactory;
