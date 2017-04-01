var Util = require('util');
var Winston = require('winston');

var Socket = exports.Socket = function (options) {
  this.name = 'socket';

  if(options.socket) {
    this.socket = options.socket;
  } else {
    throw new Error('Cannot log to a socket without a socket object.');
  }

  this.level     = options.level || 'info';
  this.label     = options.label || null;
  this.silent    = options.silent || null;
};

Util.inherits(Socket, Winston.Transport);

Socket.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var payload = {
    log: this.label,
    level: level,
    message: msg,
    time: new Date().toTimeString().split(" ")[0],
  };

  this.socket.emit('chat-log-resp', payload);
};

module.exports = Socket;

Object.defineProperty(Winston.transports, 'Socket', {
  configurable: true,
  enumerable: true,
  get: function () {
    return require('./Socket').Socket;
  }
});
