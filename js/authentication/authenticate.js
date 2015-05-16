var db_utils  = require("../nedb/database_utils");
var s_service = require("../smtp_service/smtp_service");

var db 			  = new db_utils();
var smtp      = new s_service();

function authenticate(){
  this.pending_auth = new Map();
};

authenticate.prototype.send_user_tolken = function(user, socket) {
  db.get_invitee(user, this.smtp_auth_token);
  if(!this.pending_auth.has(user)){
    this.pending_auth.set(user, socket);
  }
};

authenticate.prototype.generate_auth_token = function() {
  return Math.random().toString(36).slice(-8).concat(Math.random().toString(36).slice(-8));
};

authenticate.prototype.smtp_auth_token = function(user) {
  var token = this.generate_auth_token();
  var socket = this.pending_auth.delete(user);

  smtp.build_and_send_auth_message(smtp.build_auth_message(token), user);
  db.add_entry({"token" : token, "socket" : socket});
};

authenticate.prototype.auth_user = function(data, callback) {
  db.get_auth_token(data, callback);
};

module.exports = authenticate;
