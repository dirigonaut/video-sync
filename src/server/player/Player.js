function Player() { }

Player.prototype.initialize = function(force) {
  if(typeof Player.prototype.protoInit === 'undefined') {
    Player.prototype.protoInit = true;

    Player.prototype.State  = Player.State;
    Player.prototype.Sync   = Player.Sync;
    Player.prototype.Auth   = Player.Auth;
  }
};

Player.prototype.assign = function(id, handle, authId){
  this.id	  	      = id;

  this.state 	  	  = null;
  this.sync         = Player.Sync.SYNCING;
  this.timestamp 	  = 0;
  this.buffer       = false;

  this.handle       = handle;
  this.authId       = authId
  this.auth         = Player.Auth.DEFAULT;
};

Player.prototype.reset = function() {
  this.state 	  	 = null;
  this.sync        = Player.Sync.SYNCING;
  this.timestamp 	 = 0;
  this.buffer      = false;
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

Player.prototype.isDesynced = function() {
  return this.sync === Player.Sync.DESYNCED;
};

Player.State = {"PAUSE" : 0, "PLAY" : 1};
Player.Sync  = {"DESYNCED": 0, "SYNCING" : 1, "SYNCED" : 2, "BUFFWAIT" : 3};
Player.Auth  = {"DEFAULT" : 0, "RESTRICTED" : 1};

module.exports = Player;
