function ClientRequestFactory() {};

ClientRequestFactory.buildVideoSegmentRequest = function(path, timeSpan) {
	var request = new Object();
	var range = timeSpan.split("-");
  request.path = path;
  request.start = range[0];
  request.end = range[1];

  return request;
};

ClientRequestFactory.buildMpdFileRequest = function(path) {
	var request = new Object();
	request.path = path;

	return request;
}

module.exports = ClientRequestFactory;
