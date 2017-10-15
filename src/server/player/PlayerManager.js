var players, redisSocket, eventKeys, log;

function PlayerManager () { };

PlayerManager.prototype.initialize = function(force) {
  if(typeof PlayerManager.prototype.protoInit === 'undefined') {
    PlayerManager.prototype.protoInit = true;
    redisSocket     = this.factory.createRedisSocket();
    eventKeys       = this.factory.createKeys();
    players         = new Map();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

PlayerManager.prototype.createPlayer = function(id) {
  var newPlayer = this.factory.createPlayer();
  newPlayer.reset();
  players.set(id, newPlayer);
  log.info(`PlayerManager.createPlayer ${id}, total players now: ${players.size}`);
};

PlayerManager.prototype.getPlayer = function(id) {
  log.silly(`PlayerManager.getPlayer ${id}`);
  var player = players.get(id);
  return player ? player : players.get('/#' + id);
};

PlayerManager.prototype.getPlayers = function() {
  log.silly('PlayerManager.getPlayers');
  return players;
};

PlayerManager.prototype.getOtherPlayers = function(id) {
  log.silly(`PlayerManager.getOtherPlayers ${id}`);
  var newMap = new Map(players);
  newMap.delete(id);
  return Array.from(newMap);
};

PlayerManager.prototype.initPlayers = function() {
  log.debug('PlayerManager.initPlayers');
  for(var p of players.values()) {
    p.reset();
  }
};

PlayerManager.prototype.removePlayer = function(id) {
  log.debug(`PlayerManager.removePlayer ${id}`);
  players.delete(id);

  var player = players.get(id);

  if(!player) {
    player = players.delete('/#' + id);
  }
};

module.exports = PlayerManager;
