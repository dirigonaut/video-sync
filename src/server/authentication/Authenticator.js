const Promise        = require('bluebird');
const Crypto        = require('crypto');

const Session       = require('../administration/Session');
const Publisher     = require('../process/redis/RedisPublisher');
const LogManager    = require('../log/LogManager');

var log           = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);
var session, publisher;

function lazyInit() {
  session         = new Session();
  publisher       = new Publisher();
}

class Authenticator {
  constructor() {
    if(typeof Authenticator.prototype.lazyInit === 'undefined') {
      lazyInit();
      Authenticator.prototype.lazyInit = true;
    }
  }
};

Authenticator.prototype.requestToken = Promise.coroutine(function* (id, data, callback) {
  log.debug("Authenticator.requestToken");
  var invitees = yield session.getInvitees();

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
});

Authenticator.prototype.validateToken = Promise.coroutine(function* (id, data, callback) {
  log.debug("Authenticator.validateToken");
  var authorized = false;

  var invitees = yield session.getInvitees();

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
});

module.exports = Authenticator;

var createToken = function() {
  return Crypto.randomBytes(24).toString('hex');
};
