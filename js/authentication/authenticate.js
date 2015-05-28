var db_utils        = require('../nedb/database_utils');
var s_service       = require('../smtp_service/smtp_service');
var p_manager       = require('../state_engine/player_manager');

var db 			        = new db_utils();
var smtp            = new s_service();
var player_manager	= new p_manager();

var self = null;

function authenticate(){
  this.debug = true;
  self = this;
};

authenticate.prototype.send_user_tolken = function(request) {
  if(this.debug){console.log("Checking " + request.data.email + " against the database");}
  db.get_invitee(request, this.smtp_auth_token);
};

authenticate.prototype.generate_auth_token = function() {
  if(this.debug){console.log("Constructing auth token");}
  return Math.random().toString(36).slice(-8).concat(Math.random().toString(36).slice(-8));
};

authenticate.prototype.smtp_auth_token = function(request) {
  console.log("User found, constructing and sending token initiating");
  var token = self.generate_auth_token();

  smtp.build_and_send_auth_message(token, request.data);
  db.add_entry({"token" : token, "session_socket" : request.socket.id, "session_user" : request.data.email});
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
