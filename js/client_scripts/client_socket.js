var serverUrl = "http://localhost:8080";
var socket		= io.connect(serverUrl, {'force new connection': true});

var client_video = null;

function client_socket() {};

client_socket.prototype.initialize = function(video) {
	client_video = video;
};

//Socket emit
client_socket.prototype.play = function() {
	socket.emit("state", {"command":"play","timestamp":""});
};

client_socket.prototype.pause = function() {
	socket.emit("state", {"command":"pause","timestamp":""});
};

client_socket.prototype.timestamp = function(time) {
	socket.emit("state", {"command":"","timestamp":time});
};

client_socket.prototype.add_smtp_server = function(user, pass, host) {
	socket.emit("db-add-smtp", {"smtp_user": user, "smtp_pass": pass, "smtp_host": host});
};

client_socket.prototype.get_smtp = function() {
	socket.emit("db-get-smpt", {});
};

client_socket.prototype.init_smtp = function(user, host) {
	socket.emit("smtp-init", {"smtp_user": user, "smtp_pass": "", "smtp_host": host});
};

client_socket.prototype.send_invitation = function(subject, message, recipients) {
	socket.emit("smtp-invite", {"subject": subject, "message": message, "recipients": recipients});
};

client_socket.prototype.add_contact = function(email, handle) {
	socket.emit("db-add-contact", {"email": email, "handle": handle});
};

client_socket.prototype.get_contacts = function() {
	socket.emit("db-get-contacts", {});
};

client_socket.prototype.delete_contact = function(email) {
	socket.emit("db-delete-contact", {"email": email});
};

client_socket.prototype.request_token = function(email) {
	socket.emit("auth-token", {"email": email, "token": ""});
};

client_socket.prototype.submit_token = function(email, token) {
	socket.emit("auth-user", {"email": email, "token": token});
};

client_socket.prototype.load_video = function(codec) {
	socket.emit('video-load', {"path": "/home/sabo-san/Downloads/video." + codec, "start": 0, "encoding": "webm"});
};

client_socket.prototype.encode_video = function(request) {
	socket.emit('video-encode', request);
};

//Socket On
socket.on('state', function (data , callback) {
	console.log(data.id + " recived: " + data.command);
	callback({"id" : data.id, "command" : data.command});
});

socket.on('all-smtp', function (data){
	console.log(data);
});

socket.on('video-ready', function(data){
  console.log('video-ready');
  socket.emit('video-stream', "");
});

socket.on('video-packet', function(data){
  console.log('video-packet');
	client_video.handle_video_packet(data);
});
