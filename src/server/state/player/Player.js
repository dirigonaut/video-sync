function Player(socket){
    this.socket	  	= socket;
    this.state 	  	= 0;
    this.timestamp 	= 0.00;
};

Player.State = {"INIT" : 0, "PLAY" : 1, "PAUSE" : 2, "SEEK" : 3, "JOIN" : 4, "SYNC" : 5};

module.exports = Player;
