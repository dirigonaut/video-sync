var players, player, redisSocket, eventKeys, log;

function PlayerManager () { };

PlayerManager.prototype.initialize = function(force) {
  if(typeof PlayerManager.prototype.protoInit === 'undefined') {
    PlayerManager.prototype.protoInit = true;
    redisSocket     = this.factory.createRedisSocket();
    player          = this.factory.createPlayer();

    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }

	if(force === undefined ? typeof PlayerManager.prototype.stateInit === 'undefined' : force) {
    PlayerManager.prototype.stateInit = true;
    players = new Map();
  }
};

PlayerManager.prototype.createPlayer = function(id, handle, authId) {
  var newPlayer = this.factory.createPlayer();
  newPlayer.assign(id, handle, authId);

  players.set(id, newPlayer);
  log.info(`PlayerManager.createPlayer ${id}, total players now: ${players.size}`);
};

PlayerManager.prototype.getPlayer = function(id) {
  log.silly(`PlayerManager.getPlayer ${id}`);
  var player = players.get(id);

  if(!player) {
    player = players.get('/#' + id);
  }

  return player;
};

PlayerManager.prototype.getPlayersAttribute = function(attr) {
  log.silly('PlayerManager.getPlayerIds');
  var temp = [];
  for(var p of players.keys()) {
    try {
      temp.push(players.get(p)[attr]);
    } catch (err) {
      throw new Error(`Attribute ${attr} does not exist in Player.`);
    }
  }

  return temp;
};

PlayerManager.prototype.getPlayers = function() {
  log.silly('PlayerManager.getPlayers');
  return players;
};

PlayerManager.prototype.removePlayer = function(id) {
  log.debug(`PlayerManager.removePlayer ${id}`);
  players.delete(id);

  var player = players.get(id);

  if(!player) {
    player = players.delete('/#' + id);
  }
};

PlayerManager.prototype.getOtherPlayers = function(id) {
  log.silly(`PlayerManager.getOtherPlayers ${id}`);
  var temp = [];
  for(var p of players.keys()) {
    if(p != id){
      temp.push(players.get(p));
    }
  }

  return temp;
};

PlayerManager.prototype.getSyncedPlayersState = function() {
  log.silly('PlayerManager.getSyncedPlayersState');
  var state = null;
  for(var p of players.keys()) {
    if(players.get(p).sync === player.Sync.SYNCED) {
      state = players.get(p).state;
      break;
    }
  }

  return state;
};

PlayerManager.prototype.getHandles = function() {
  log.debug('PlayerManager.getHandles');
  var temp = [];
  for(var p of players.keys()) {
    temp.push([players.get(p).id, players.get(p).handle]);
  }

  return temp;
};

PlayerManager.prototype.setPlayerHandle = function(id, handle) {
  log.silly('PlayerManager.setPlayerHandle', id);

  for(var p of players.keys()) {
    if(p === id) {
      players.get(p).setHandle(handle);

      var handles = [];
      for(var p of players.keys()) {
        handles.push([players.get(p).id, players.get(p).handle]);
      }

      redisSocket.broadcast(eventKeys.HANDLES, handles);
      break;
    }
  }
};

PlayerManager.prototype.initPlayers = function() {
  log.debug('PlayerManager.initPlayers');
  for(var p of players.values()) {
    p.reset();
  }
};

PlayerManager.prototype.setAuth = function(id, level) {
  log.debug('PlayerManager.setAuth');
  for(var p of players.keys()) {
    if(p === id) {
      players.get(p).setAuth(level);
    }
  }
};

module.exports = PlayerManager;
