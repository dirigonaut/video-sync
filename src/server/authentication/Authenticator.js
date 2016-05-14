var NeDatabase    = require('../database/NeDatabase');
var PlayerManager = require('../state/player/PlayerManager');

var database			= new NeDatabase();
var playerManager	= new PlayerManager();

function Authenticator(){
};

Authenticator.prototype.generateToken = function() {
  return Math.random().toString(36).slice(-8).concat(Math.random().toString(36).slice(-8));
};

Authenticator.prototype.requestToken = function(data, id, callback) {
  console.log("Authenticator.requestToken");
  database.isUserInSession(data, function(userInSession){
    if(userInSession) {
      var token = this.generateToken();
      database.saveTokenToSession(id, token);
      callback(token);
    }
  });
};

Authenticator.prototype.validateToken = function(data) {
  console.log("Authenticator.validateToken");
  database.isUserAndTokenInSession(data, function(authorized){
    if(authorized) {
      callback(authorized);
    }
  });
};

module.exports = Authenticator;
