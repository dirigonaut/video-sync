const Promise        = require('bluebird');
const Crypto        = require('crypto');

var publisher;

function Authenticator() { }

Authenticator.prototype.initialize = Promise.coroutine(function*() {
  if(typeof Authenticator.prototype.lazyInit === 'undefined') {
    publisher = yield this.createRedisPublisher();
    Authenticator.prototype.lazyInit = true;
  }
};

Authenticator.prototype.requestToken = Promise.coroutine(function* (id, data, callback) {
  this.log.debug("Authenticator.requestToken");
  var invitees = yield this.session.getInvitees();

  for(var i in invitees) {
    if(invitees[i].email === data.address) {
      invitees[i].id = id;
      invitees[i].pass = createToken();

      this.log.debug(`Created Token: ${invitees[i].pass} for Address: ${data.address}`);
      this.session.setInvitees(invitees);
      callback({'id': invitees[i].id, 'address': invitees[i].email, 'pass': invitees[i].pass});
      break;
    }
  }
});

Authenticator.prototype.validateToken = Promise.coroutine(function* (id, data, callback) {
  this.log.debug("Authenticator.validateToken");
  var authorized = false;

  var invitees = yield this.session.getInvitees();

  var checkIfLoggedIn = function(loggedInIds) {
    for(var i in invitees) {
      if(invitees[i].pass === data.token && invitees[i].email === data.address && !loggedInIds.includes(invitees[i].id)) {
        this.log.info("The following id has been authenticated: ", id);
        authorized = true;
        invitees[i].id = id;

        this.session.setInvitees(invitees);
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
