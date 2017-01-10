function Player(socket){
    this.socket	  	= socket;

    this.state 	  	= null;
    this.sync       = 0;
    this.timestamp 	= 0;

    this.handle     = "JohnDoe";
    this.auth       = Player.Auth.DEFAULT;
};

Player.prototype.isInit = function() {
  return this.sync == Player.Sync.SYNCING && this.timestamp == 0;
};

Player.State = {"PLAY" : 0, "PAUSE" : 1};
Player.Sync  = {"SYNCING" : 0, "SYNCED" : 1, "SYNCWAIT": 2, "DESYNCED" : 3};
Player.Auth  = {"DEFAULT" : 0, "RESTRICTED" : 1};

module.exports = Player;
