var Util = require('util');
var Winston = require('winston');

var SocketTransport = Winston.transports.SocketTransport = function (options) {
  //
  // Name this logger
  //
  this.name = 'socketTransport';

  //
  // Set the level from your options
  //
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

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
Util.inherits(SocketTransport, Winston.Transport);

SocketTransport.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var self = this,
      output;

  output = common.log({
    json:        this.json,
    level:       level,
    message:     msg,
    meta:        meta,
    stringify:   this.stringify,
    timestamp:   this.timestamp,
    showLevel:   this.showLevel,
    label:       this.label,
    formatter:   this.formatter,
    humanReadableUnhandledException: true
  });

  console.log(output);
  this.socket.emit('log', output);

  //
  // Store this message and metadata, maybe use some custom logic
  // then callback indicating success.
  //
  self.emit('logged');
  callback(null, true);
};

module.exports = SocketTransport;
