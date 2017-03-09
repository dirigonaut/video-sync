function Player(socket, handle){
    this.socket	  	= socket;

    this.state 	  	= null;
    this.sync       = Player.Sync.SYNCING;
    this.timestamp 	= 0;

    this.handle     = handle;
    this.auth       = Player.Auth.DEFAULT;
};

Player.prototype.init = function() {
  this.state 	  	= null;
  this.sync       = Player.Sync.SYNCING;
  this.timestamp 	= 0;
};

Player.prototype.isInit = function() {
  return this.sync === Player.Sync.SYNCING && this.timestamp === 0;
};

Player.prototype.setHandle = function(handle) {
  this.handle = handle;
};

Player.prototype.setAuth = function(auth) {
  this.auth = auth;
};

Player.prototype.getAuth = function() {
  return this.auth;
};

Player.State = {"PLAY" : 0, "PAUSE" : 1};
Player.Sync  = {"SYNCING" : 0, "SYNCED" : 1, "SYNCWAIT": 2, "DESYNCED" : 3};
Player.Auth  = {"DEFAULT" : 0, "RESTRICTED" : 1};

module.exports = Player;
