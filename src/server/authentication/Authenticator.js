const crypto      = require('crypto');

var NeDatabase    = require('../database/NeDatabase');
var Session       = require('../administration/Session');
var LogManager    = require('../log/LogManager');

var database			= new NeDatabase();
var session       = new Session();
var log           = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);

function Authenticator(){
};

Authenticator.prototype.requestToken = function(id, data, callback) {
  log.debug("Authenticator.requestToken");
  if(session.getActiveSession() !== null && session.getActiveSession() !== undefined) {
    var invitees = session.getActiveSession().invitees;

    for(var x in invitees) {
      if(invitees[x] == data.address) {
        log.silly("Created Token for Id: ", id);
        var token = createToken(id, data.address);
        database.createToken(token, callback);
      }
    }
  }
};

Authenticator.prototype.validateToken = function(id, data, callback) {
  log.debug("Authenticator.validateToken");
  if(session.getActiveSession() !== null && session.getActiveSession() !== undefined) {
    var invitees = session.getActiveSession().invitees;

    var authorize = function(token) {
      var authorized = false;

      if(token.length > 0) {
        if(token[0].token == data.token && token[0].address == data.address) {
          log.silly("The following id has been authenticated: ", id);
          authorized = true;
        }
      }

      session.associateIdToEmail(id, data.address);
      callback(authorized);
    }

    for(var x in invitees) {
      if(invitees[x] == data.address) {
        database.readToken(data.address, data.token, authorize);
      }
    }
  }
};

module.exports = Authenticator;

var createToken = function(id, address) {
  log.silly("createToken");
  var token = new Object();

  token._id     = id
  token.address = address;
  token.token   = crypto.randomBytes(24).toString('hex');

  return token;
}
