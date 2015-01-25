function player(socket){
    this.id = socket.id;
    this.connect = socket;
    this.time = "0";
    this.status = "NONE";
    this.command = null;
    this.timestamp = 0.00;
};

module.exports = player;
