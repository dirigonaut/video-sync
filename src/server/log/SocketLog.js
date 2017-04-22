var Util  = require('util');
var Session = require('../administration/Session');

var session = new Session();
var io = null;

function SocketLog () {

};

SocketLog.prototype.initialize = function(socketIO) {
  io = socketIO;
}

SocketLog.prototype.log = function (msg, meta) {
  var payload = {
    log : 'socket',
    level : 'info',
    message: msg,
    meta: Util.inspect(meta, { showHidden: false, depth: 1 }),
    time: new Date().toTimeString().split(" ")[0]
  };

  var onAdminIds = function(ids) {
    if(ids !== null && ids !== undefined) {
      console.log(ids);
      io.sockets.to(ids).emit('chat-log-resp', payload);
    }
  };

  session.getAdmin(onAdminIds);
};

module.exports = SocketLog;
