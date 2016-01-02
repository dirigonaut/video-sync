function ClientRequestFactory() {};

ClientRequestFactory.buildVideoRangeRequest = function(path, range) {
	var request = new Object();
	var range = range.split("-");
  request.path = path;
  request.start = range[0];
  request.end = range[1];

  return request;
};

ClientRequestFactory.buildVideoTimestampRequest = function(path, timestamp) {
	var request = new Object();
  request.path = path;
  request.timestamp = timestamp;

  return request;
};

ClientRequestFactory.buildMpdFileRequest = function(path) {
	var request = new Object();
	request.path = path;

	return request;
};


module.exports = ClientRequestFactory;
