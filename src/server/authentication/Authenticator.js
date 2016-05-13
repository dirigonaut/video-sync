var NeDatabase    = require('../database/NeDatabase');
var Smtp          = require('../smtp/Smtp');
var PlayerManager = require('../state/player/PlayerManager');

var database			= new NeDatabase();
var smtp          = new Smtp();
var playerManager	= new PlayerManager();

function genToken(){
  return Math.random().toString(36).slice(-8).concat(Math.random().toString(36).slice(-8));
}

function Authenticator(){
  this.debug = true;
};

Authenticator.prototype.sendUserToken = function(request) {
  if(this.debug){console.log("Checking " + request.data.email + " against the database");}
  db.get_invitee(request, this.smtp_auth_token);
};

Authenticator.prototype.smtpToken = function(request) {
  console.log("User found, constructing and sending token initiating");
  var token = gen_token();

  smtp.buildAndSendAuthMessage(token, request.data);
  request.data = {"email" : request.data[0].email, "token" : token}
  db.add_entry(request);
};

Authenticator.prototype.authorizeUser = function(request) {
  if(this.debug){console.log("Checking " + request.data.email + "'s token against the database");}
  db.get_auth_token(request, this.auth_confirmed);
};

Authenticator.prototype.authorized = function(request) {
  if(this.debug){console.log(request.socket.id + " has been authenticated");}
  request.socket.auth = true;
  player_manager.create_player(request.socket);
};

module.exports = Authenticator;
