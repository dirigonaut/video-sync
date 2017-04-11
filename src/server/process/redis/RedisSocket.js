var io = null;

function RedisSocket() {
}

RedisSocket.prototype.initialize = function(socketIO) {
  io = socketIO;
};

RedisSocket.prototype.broadcastToIds = function(ids, key, message) {
  if(io !== null) {
    if(ids !== null && ids !== undefined && ids.length > 0) {
      io.sockets.in(ids).emit(key, message);
    }
  }
};

module.exports = RedisSocket;
