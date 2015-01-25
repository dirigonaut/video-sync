var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var Engine = require('./rules_engine');
var rules_engine = new Engine();

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
  socket.emit('news', { hello: 'world' });
  
  socket.on('state', function (data) {
	rules_engine.process_state(data, socket);
  });
  
  socket.on('admin', function (data) {
	console.log('admin');
    console.log(data);
  });
});
