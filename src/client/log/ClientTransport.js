var Util = require('util');
var Winston = require('winston');

const EVENT = "client-log";

var ClientTransport = exports.ClientTransport = function (options) {
  console.log('Creating client transport');

  if(options.callback) {
    this.callback = options.callback;
  } else {
    throw new Error('Cannot log to the ui without a callback to process the payload.');
  }

  this.level     = options.level || 'info';
  this.label     = options.label || null;
  this.silent    = options.silent || null;
};

Util.inherits(ClientTransport, Winston.Transport);

ClientTransport.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var payload = {
    log: this.label,
    level: level,
    message: msg,
    meta: Util.inspect(meta, { showHidden: true, depth: null }),
    time: new Date().toTimeString().split(" ")[0],
  };

  this.callback(payload);
};

module.exports = ClientTransport;

Object.defineProperty(Winston.transports, 'ClientTransport', {
  configurable: true,
  enumerable: true,
  get: function () {
    return require('./ClientTransport').ClientTransport;
  }
});
