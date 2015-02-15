function client_socket_test() {
	this.socket1 = io.connect("http://localhost:8080");
	this.socket1.on('state', function (data , callback) {
		callback("play");});
};

client_socket_test.prototype.test_suite = function() {
	this.play_test();
	this.pause_test();
	this.pause_sync_test();
	this.play_sync_test();
};

client_socket_test.prototype.play_test = function() {
	this.socket1.emit("state", {"command":"play","timestamp":""})
};

client_socket_test.prototype.pause_test = function() {};

client_socket_test.prototype.pause_sync_test = function() {};

client_socket_test.prototype.play_sync_test = function() {};
