function Player() { }

Player.prototype.reset = function() {
  this.state 	  	 = null;
  this.sync        = Player.Enum.Sync.SYNCING;
  this.timestamp 	 = 0;
  this.buffer      = false;
};

Player.Enum = {};
Player.Enum.State = { "PAUSE" : 0, "PLAY" : 1 };
Player.Enum.Sync  = { "SYNCING" : 0, "SYNCED" : 1, "BUFFWAIT" : 2 };

module.exports = Player;
