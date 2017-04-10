var io = null;

function RedisSocket() {
}

RedisSocket.prototype.initialize = function(socketIO) {
  io = socketIO;
};

RedisSocket.prototype.broadcastToIds = function(ids, key, message, callback) {
  if(io !== null) {
    if(ids !== null && ids !== undefined && ids.length > 0) {
      if(typeof message !== 'function') {
        io.sockets.in(ids).emit(key, message, callback);
      } else {
        io.sockets.in(ids).emit(key, callback);
      }
    }
  }
};

module.exports = RedisSocket;
