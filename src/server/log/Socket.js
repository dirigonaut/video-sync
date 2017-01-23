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
  this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
  this.formatter = options.formatter || null;
  this.showLevel = options.showLevel === undefined ? true : options.showLevel;
  this.label     = options.label || null;
  this.silent    = options.silent || null;

  if (this.json) {
    this.stringify = options.stringify || function (obj) {
      return JSON.stringify(obj, null, 2);
    };
  }
};

Util.inherits(Socket, Winston.Transport);

Socket.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var self = this,
      output;

  console.log(output);
  this.socket.emit('log', output);

  //self.emit('logged');
  //callback(null, true);
};

module.exports = Socket;

Object.defineProperty(Winston.transports, 'Socket', {
  configurable: true,
  enumerable: true,
  get: function () {
    return require('./Socket').Socket;
  }
});
