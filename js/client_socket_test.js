var sockets = new Array();

function client_socket_test() {
	
	var serverUrl = "http://localhost:8080";
	this.number_of_sockets = 4;
	
	for(var i = 0; i < this.number_of_sockets; ++i){
		var socket = io.connect(serverUrl, {
		'force new connection': true});
		
		socket.on('state', function (data , callback) {
		console.log(data.id + " recived: " + data.command);
		callback(data.id, data.command);});
		
		sockets.push(socket);
	}
};

client_socket_test.prototype.play = function() {
	sockets[0].emit("state", {"command":"play","timestamp":""})
};

client_socket_test.prototype.pause = function() {
	sockets[0].emit("state", {"command":"pause","timestamp":""})
};

client_socket_test.prototype.timestamp = function(time, id) {
	sockets[id].emit("state", {"command":"","timestamp":time});
};

client_socket_test.prototype.timestamp_all = function(time) {
	for(var i in sockets){
		this.timestamp(time, i);
	}
};

client_socket_test.prototype.add_smtp_server = function(user, pass, host) {
	sockets[0].emit("smtp", {"smtp_user": user, "smtp_pass": pass, "smtp_host": host})
};

client_socket_test.prototype.send_invitation = function(subject, text, recipients) {
	sockets[0].emit("email", {"subject": subject, "message": text, "recipients": recipients})
};
