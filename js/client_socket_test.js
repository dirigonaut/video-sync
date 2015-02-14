function client_socket_test() {};

client_socket_test.prototype.play_test = function() {
	var socket1 = io("http://localhost:8080");
	socket1.on('state', function (data , callback) {
		callback(this, data.command);});
		
	socket1.emit("state", "command: play, timestamp: 0.00")
};

client_socket_test.prototype.pause_test = function() {};

client_socket_test.prototype.pause_sync_test = function() {};

client_socket_test.prototype.play_sync_test = function() {};
