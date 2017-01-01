function RequestFactory() {};

RequestFactory.prototype.buildVideoSegmentRequest = function(typeId, path, segment) {
	console.log('RequestFactory.buildVideoSegmentRequest');
	var request = new Object();
	request.typeId	= typeId;
  request.path		= path;
  request.segment	= segment;
  return request;
};

RequestFactory.prototype.buildVideoMetaDataRequest = function(path, type) {
	console.log('RequestFactory.buildVideoMetaDataRequest');
	var request = new Object();
	request.path = path;
	return request;
};

RequestFactory.prototype.buildStateRequest = function(state, time) {
	var request = new Object();
	request.state = state;
	request.time = time;
	return request;
};

RequestFactory.prototype.buildSmtpRequest = function(type, host, address, password) {
	console.log("RequestFactory.buildSmtpCreateRequest");
	var request	= new Object();
	request.smtpType			= type;
	request.smtpHost			= host;
	request.smtpAddress		= address;
	request.smtpPassword	= password;
	return request;
};

RequestFactory.prototype.buildContactRequest = function(handle, address) {
	console.log("RequestFactory.buildCreateContactRequest");
	var request = new Object();
	request.handle	= handle;
	request.address	= address;
	return request;
};

RequestFactory.prototype.buildSessionRequest = function(title, smtp, invitees, mailOptions) {
	console.log("RequestFactory.buildCreateSessionRequest");
	var request = new Object();
	request.title        = title;
  request.smtp         = smtp;
  request.invitees     = invitees;
  request.mailOptions  = mailOptions;
	return request;
};

RequestFactory.prototype.buildMailOptionsRequest = function(from, to, subject, text, html) {
	console.log("RequestFactory.buildMailOptionsRequest");
	var request = new Object();
	request.from 		= from;
	request.to 			= to;
	request.subject	= subject;
	request.text 		= text;
	request.html 		= html;
	return request;
};

RequestFactory.prototype.buildVideoStateRequest = function(videoElement) {
	var request = new Object();
	request.timestamp	= videoElement.currentTime;
	request.state			= videoElement.paused;
	request.buffering	= videoElement.buffering;
	return request;
};

module.exports = RequestFactory;
