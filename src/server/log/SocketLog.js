const Promise = require('bluebird');
const Util    = require('util');
const Session = require('../administration/Session');

var session, io;

function lazyInit() {
  session = new Session();
}

class SocketLog {
  constructor() {
    if(typeof SocketLog.prototype.lazyInit === 'undefined') {
      lazyInit();
      SocketLog.prototype.lazyInit = true;
    }
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

  var ids = yield session.getAdmin(onAdminIds);
  if(ids !== null && ids !== undefined) {
    console.log(ids);
    io.sockets.to(ids).emit('chat-log-resp', payload);
  }
});

module.exports = SocketLog;
