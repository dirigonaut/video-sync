function Player() { }

Player.prototype.initialize = function() {
  if(typeof Player.prototype.protoInit === 'undefined') {
    Player.prototype.protoInit = true;

    Player.prototype.State  = Player.State;
    Player.prototype.Sync   = Player.Sync;
    Player.prototype.Auth   = Player.Auth;
  }
};

Player.prototype.assign = function(id, handle){
    this.id	  	      = id;

    this.initialized  = false;
    this.state 	  	  = null;
    this.sync         = Player.Sync.SYNCING;
    this.timestamp 	  = 0;

    this.handle       = handle;
    this.auth         = Player.Auth.DEFAULT;
};

Player.prototype.reset = function() {
  this.initialized = false;
  this.state 	  	 = null;
  this.sync        = Player.Sync.SYNCING;
  this.timestamp 	 = 0;
};

Player.prototype.isInit = function() {
  return this.initialized;
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
