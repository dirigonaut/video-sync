const Promise        = require('bluebird');
const Crypto        = require('crypto');

var publisher;

function Authenticator() { }

Authenticator.prototype.initialize = function() {
  if(typeof Authenticator.prototype.protoInit === 'undefined') {
    publisher       = this.factory.createRedisPublisher();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.AUTHENTICATION);

    Authenticator.prototype.protoInit = true;
  }
};

Authenticator.prototype.requestToken = Promise.coroutine(function* (id, data) {
  log.debug("Authenticator.requestToken");
  var invitees = yield session.getInvitees();

  for(var i in invitees) {
    if(invitees[i].email === data.address) {
      invitees[i].id = id;
      invitees[i].pass = createToken();

      log.debug(`Created Token: ${invitees[i].pass} for Address: ${data.address}`);
      yield session.setInvitees(invitees);
      return {'id': invitees[i].id, 'address': invitees[i].email, 'pass': invitees[i].pass};
    }
  }
});

Authenticator.prototype.validateToken = Promise.coroutine(function* (id, data) {
  log.debug("Authenticator.validateToken");
  var authorized = false;
  var invitees = yield session.getInvitees();

  var loggedInIds = yield publisher.publishAsync(Publisher.Enum.PLAYER, ['getPlayerIds', []]);
  if(loggedInIds) {
    for(var i in invitees) {
      if(invitees[i].pass === data.token && invitees[i].email === data.address && !loggedInIds.includes(invitees[i].id)) {
        log.info("The following id has been authenticated: ", id);
        authorized = true;
        invitees[i].id = id;

        yield session.setInvitees(invitees);
        break;
      }
    }
  }

  return authorized;
});

module.exports = Authenticator;

var createToken = function() {
  return Crypto.randomBytes(24).toString('hex');
};
