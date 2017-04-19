const crypto      = require('crypto');

var Session       = require('../administration/Session');
var Publisher     = require('../process/redis/RedisPublisher');
var LogManager    = require('../log/LogManager');

var session       = new Session();
var publisher     = new Publisher();
var log           = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);

function Authenticator(){
};

Authenticator.prototype.requestToken = function(id, data, callback) {
  log.debug("Authenticator.requestToken");
  var checkIfInvited = function(err, invitees) {
    if(err) {
      log.error(err);
    } else {
      for(var i in invitees) {
        if(invitees[i].email === data.address) {
          invitees[i].id = id;
          invitees[i].pass = createToken();

          log.debug(`Created Token: ${invitees[i].password} for Address: ${data.address}`);
          session.setInvitees(invitees);
          break;
        }
      }
    }
  }

  session.getInvitees(checkIfInvited);
};

Authenticator.prototype.validateToken = function(id, data, callback) {
  log.debug("Authenticator.validateToken");
  var authorized = false;

  var checkIfValidToken = function(err, invitees) {
    if(err) {
      log.error(err);
    } else {
      for(var i in invitees) {
        if(invitees[i].password === data.token && invitees[i].email === data.address) {
          log.silly("The following id has been authenticated: ", id);
          authorized = true;
          break;
        }
      }
      callback(authorized);
    }
  }

  session.getInvitees(checkIfValidToken);
};

module.exports = Authenticator;

var createToken = function() {
  return crypto.randomBytes(24).toString('hex');
};
