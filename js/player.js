function player(socket){
    this.id 		= socket.id;
    this.status 	= "NONE";
    this.timestamp 	= 0.00;
};

module.exports = player;
