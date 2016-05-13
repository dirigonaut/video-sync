var NeDatabase      = require('../database/NeDatabase');
var s_service       = require('../smtp_service/smtp_service');
var p_manager       = require('../../state/player/player_manager');

var database			  = new NeDatabase();
var smtp            = new s_service();
var player_manager	= new p_manager();

function gen_token(){
  return Math.random().toString(36).slice(-8).concat(Math.random().toString(36).slice(-8));
}

function authenticate(){
  this.debug = true;
};

authenticate.prototype.send_user_tolken = function(request) {
  if(this.debug){console.log("Checking " + request.data.email + " against the database");}
  db.get_invitee(request, this.smtp_auth_token);
};

authenticate.prototype.smtp_auth_token = function(request) {
  console.log("User found, constructing and sending token initiating");
  var token = gen_token();

  smtp.build_and_send_auth_message(token, request.data);
  request.data = {"email" : request.data[0].email, "token" : token}
  db.add_entry(request);
};

authenticate.prototype.auth_user = function(request) {
  if(this.debug){console.log("Checking " + request.data.email + "'s token against the database");}
  db.get_auth_token(request, this.auth_confirmed);
};

authenticate.prototype.auth_confirmed = function(request) {
  if(this.debug){console.log(request.socket.id + " has been authenticated");}
  request.socket.auth = true;
  player_manager.create_player(request.socket);
};

module.exports = authenticate;
