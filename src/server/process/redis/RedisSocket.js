var LogManager    = require('../../log/LogManager');
var log           = LogManager.getLog(LogManager.LogEnum.GENERAL);

var io = null;

function RedisSocket() {
}

RedisSocket.prototype.initialize = function(socketIO) {
  io = socketIO;
};

RedisSocket.prototype.broadcastToIds = function(ids, key, message) {
  log.silly(`RedisSocket.prototype.broadcastToIds`);

  if(io !== null) {
    if(ids !== null && ids !== undefined) {
      for(var i in ids) {
        io.sockets.to(ids[i]).emit(key, message);
      }
    }
  }
};

RedisSocket.prototype.broadcastToId = function(id, key, message) {
  log.silly(`RedisSocket.prototype.broadcastToId`);

  if(io !== null) {
    io.sockets.to(id).emit(key, message);
  }
};

module.exports = RedisSocket;
