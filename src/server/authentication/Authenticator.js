const crypto        = require('crypto');

const Session       = require('../administration/Session');
const Publisher     = require('../process/redis/RedisPublisher');
const LogManager    = require('../log/LogManager');

var log           = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);
var session, publisher;

function lazyInit() {
  session         = new Session();
  publisher       = new Publisher();
}

class Authenticator{
  constructor() {
    if(typeof Authenticator.prototype.lazyInit === 'undefined') {
      lazyInit();
      Authenticator.prototype.lazyInit = true;
    }
  }
};

Authenticator.prototype.requestToken = function(id, data, callback) {
  log.debug("Authenticator.requestToken");
  var checkIfInvited = function(invitees) {
    for(var i in invitees) {
      if(invitees[i].email === data.address) {
        invitees[i].id = id;
        invitees[i].pass = createToken();

        log.debug(`Created Token: ${invitees[i].pass} for Address: ${data.address}`);
        session.setInvitees(invitees);
        callback({'id': invitees[i].id, 'address': invitees[i].email, 'pass': invitees[i].pass});
        break;
      }
    }
  };

  session.getInvitees(checkIfInvited);
};

Authenticator.prototype.validateToken = function(id, data, callback) {
  log.debug("Authenticator.validateToken");
  var authorized = false;

  var checkIfValidToken = function(invitees) {
    var checkIfLoggedIn = function(loggedInIds) {
      for(var i in invitees) {
        if(invitees[i].pass === data.token && invitees[i].email === data.address && !loggedInIds.includes(invitees[i].id)) {
          log.info("The following id has been authenticated: ", id);
          authorized = true;
          invitees[i].id = id;

          session.setInvitees(invitees);
          break;
        }
      }

      callback(authorized);
    };

    publisher.publish(Publisher.Enum.PLAYER, ['getPlayerIds', []], checkIfLoggedIn);
  };

  session.getInvitees(checkIfValidToken);
};

module.exports = Authenticator;

var createToken = function() {
  return crypto.randomBytes(24).toString('hex');
};
