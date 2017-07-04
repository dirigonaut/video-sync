const Promise = require('bluebird');
const Util    = require('util');

var io, session;

function SocketLog() { }

SocketLog.prototype.initialize = function(force) {
  if(force === undefined ? typeof SocketLog.prototype.stateInit === 'undefined' : force) {
    SocketLog.prototype.stateInit = true;
    session  = this.factory.createSession();
  }
};

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
