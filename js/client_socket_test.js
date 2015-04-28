var sockets = new Array();

function client_socket_test() {
	
	var serverUrl = "http://localhost:8080";
	this.number_of_sockets = 4;
	
	for(var i = 0; i < this.number_of_sockets; ++i){
		var socket = io.connect(serverUrl, {
		'force new connection': true});
		
		socket.on('state', function (data , callback) {
		console.log(data.id + " recived: " + data.command);
		callback({"id" : data.id, "command" : data.command});});
		
		socket.on('all-smtp', function (data){
			console.log(data);
		});
		
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
	sockets[0].emit("db-add-smtp", {"user": user, "pass": pass, "host": host, "primary" : true})
};

client_socket_test.prototype.get_smtp = function() {
	sockets[0].emit("db-smpt-get", {})
};

client_socket_test.prototype.send_invitation = function(subject, text, recipients) {
	sockets[0].emit("send-email", {"subject": subject, "message": text, "recipients": recipients})
};

client_socket_test.prototype.add_contact = function(email, handle) {
	sockets[0].emit("db-add-contact", {"email": email, "handle": handle})
};

client_socket_test.prototype.get_contacts = function() {
	sockets[0].emit("db-get-contacts", {})
};

client_socket_test.prototype.delete_contact = function(email) {
	sockets[0].emit("db-delete-contact", {"email": email})
};
