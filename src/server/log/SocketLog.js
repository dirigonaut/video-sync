const Promise = require('bluebird');
const Util    = require('util');

var io;

function SocketLog() { }

SocketLog.prototype.setSocketIO = function(socketIO) {
  io = socketIO;
}

SocketLog.prototype.log = Promise.coroutine(function* (msg, meta) {
  var payload = {
    log : 'socket',
    level : 'info',
    message: msg,
    meta: Util.inspect(meta, { showHidden: false, depth: 1 }),
    time: new Date().toTimeString().split(" ")[0]
  };

  var ids = yield session.getAdmin();
  if(ids) {
    io.sockets.to(ids).emit('chat-log-resp', payload);
  }
});

module.exports = SocketLog;
