var NeDatabase    = require('../database/NeDatabase');
var Session       = require('../utils/Session');

var database			= new NeDatabase();
var session       = new Session();

function Authenticator(){
};

Authenticator.prototype.requestToken = function(id, address, callback) {
  console.log("Authenticator.requestToken");
  var invitees = session.getActiveSession().invitees;

  for(var x in invitees) {
    if(invitees[x] == address) {
      var token = createToken(id, address);
      database.createToken(token, callback);
    }
  }
};

Authenticator.prototype.validateToken = function(id, address, userToken, callback) {
  console.log("Authenticator.validateToken");
  var invitees = session.getActiveSession().invitees;

  var authorize = function(token) {
    if(token.value == userToken && token.key == address) {
      database.deleteTokens(id);
      callback();
    }
  }

  for(var x in invitees) {
    if(invitees[x] == address) {
      database.loadToken(id, authorize);
    }
  }
};

module.exports = Authenticator;

var createToken = function(id, address) {
  var token = new Object();

  token.id = id
  token.key = address;
  token.value = Math.random().toString(36).slice(-8).concat(Math.random().toString(36).slice(-8));

  return token;
}
