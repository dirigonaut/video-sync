function Player(socket){
    this.socket	  	= socket;
    this.handle     = "JohnDoe";
    this.state 	  	= null;
    this.sync       = 0;
    this.timestamp 	= 0;
};

Player.prototype.isInit = function() {
  return this.sync == Player.Sync.SYNCING && this.timestamp == 0;
}

Player.State = {"PLAY" : 0, "PAUSE" : 1};
Player.Sync  = {"SYNCING" : 0, "SYNCED" : 1, "SYNCWAIT": 2, "DESYNCED" : 3};

module.exports = Player;
