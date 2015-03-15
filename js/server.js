var app 			= require('http').createServer(handler);
var io 				= require('socket.io')(app);
var fs 				= require('fs');
var r_engine 		= require('./state_engine/rules_engine');
var p_manager 		= require('./state_engine/player_manager');
var s_service		= require('./smtp_service/smtp_service');

var rules_engine 	= new r_engine();
var player_manager	= new p_manager();
var smtp_service	= new s_service();

app.listen(8080);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function (socket) {
	console.log("socket has connected: " + socket.id);
	player_manager.create_player(socket);
	
	socket.on('state', function (data) {
		console.log(data);
		rules_engine.process_rules(data, socket, player_manager);
	});
	
	socket.on('admin', function (data) {
		console.log('admin');
		console.log(data);
	});
	
	socket.on('smtp', function (data) {
		console.log('smtp');
		console.log(data);
		smtp_service.add_smtp_service(data);
	});
  
	socket.on('email', function (data) {
		console.log('email');
		console.log(data);
		smtp_service.send_invitation(data);
	});
});
