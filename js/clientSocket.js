var socket = io('http://localhost:8080');
	socket.on('news', function (data) {
	console.log(data);
	socket.emit('state', { my: 'data' });
});
