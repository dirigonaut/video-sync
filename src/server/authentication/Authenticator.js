const crypto      = require('crypto');

var NeDatabase    = require('../database/NeDatabase');
var Session       = require('../utils/Session');
var Logger        = require('../utils/Logger');

var database			= new NeDatabase();
var session       = new Session();
var log           = new Logger();

function Authenticator(){
};

Authenticator.prototype.requestToken = function(id, data, callback) {
  console.log("Authenticator.requestToken");
  var invitees = session.getActiveSession().invitees;

  for(var x in invitees) {
    if(invitees[x] == data.address) {
      var token = createToken(id, data.address);
      database.createToken(token, callback);
    }
  }
};

Authenticator.prototype.validateToken = function(id, data, callback) {
  console.log("Authenticator.validateToken");
  if(session.getActiveSession() != null) {
    var invitees = session.getActiveSession().invitees;

    var authorize = function(token) {
      var authorized = false;

      if(token.length > 0) {
        if(token[0].token == data.token && token[0].address == data.address) {
          authorized = true;
        }
      }

      callback(authorized);
    }

    var users = invitees[0].split(" ");
    for(var x in users) {
      if(users[x] == data.address) {
        database.readToken(data.address, data.token, authorize);
      }
    }
  }
};

module.exports = Authenticator;

var createToken = function(id, address) {
  var token = new Object();

  token._id     = id
  token.address = address;
  token.token   = crypto.randomBytes(24).toString('hex');

  return token;
}
