const Promise = require('bluebird');

var publisher, redisSocket, smtp, session, config, playerManager, player, log;

function UserAdministration() { }

UserAdministration.prototype.initialize = function (force) {
  if(typeof UserAdministration.prototype.protoInit === 'undefined') {
    UserAdministration.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    config          = this.factory.createConfig();
    session         = this.factory.createSession();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);
  }

  if(force === undefined ? typeof UserAdministration.prototype.stateInit === 'undefined' : force) {
    UserAdministration.prototype.stateInit = true;
    publisher       = this.factory.createRedisPublisher();
    smtp            = this.factory.createSmtp();
    playerManager   = this.factory.createPlayerManager(false);
    redisSocket     = this.factory.createRedisSocket();
  }
};

UserAdministration.prototype.downgradeUser = Promise.coroutine(function* (user) {
  log.debug("UserAdministration.downgradeUser", user);
  yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.SETAUTH, [user, player.Auth.RESTRICTED]]);
});

UserAdministration.prototype.upgradeUser = Promise.coroutine(function*(user) {
  log.debug("UserAdministration.upgradeUser", user);
  yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.SETAUTH, [user, player.Auth.DEFAULT]]);
});

UserAdministration.prototype.kickUser = Promise.coroutine(function* (user) {
  log.debug("UserAdministration.kickUser", user);
  var isAdmin = yield session.isAdmin(user);
  if(!isAdmin) {
    var player = yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.GETPLAYER, [user]]);

    if(player) {
      yield session.removeInvitee(user).catch(log.error);
      yield redisSocket.disconnect(user);
    } else {
      log.warn("There is no player with the id: ", user);
    }
  } else {
    new Error(`Cannot kick admin.`);
  }
});

UserAdministration.prototype.inviteUser = Promise.coroutine(function* (emailAddress) {
  log.debug("UserAdministration.inviteUser");
  var activeSession = yield session.getSession();

  if(activeSession) {
    session.addInvitee(emailAddress);

    yield smtp.initializeTransport(activeSession.smtp);
    var mailOptions = activeSession.mailOptions;
    mailOptions.invitees = [emailAddress];

    log.debug(mailOptions)
    smtp.sendMail(addP2PLink(mailOptions));
  } else {
    log.warn("There is no active session to load smtp info from.");
  }
});

UserAdministration.prototype.inviteUsers = Promise.coroutine(function* () {
  log.debug("UserAdministration.inviteUsers");
  var activeSession = yield session.getSession();

  if(activeSession) {
    yield smtp.initializeTransport(activeSession.smtp);
    smtp.sendMail(addP2PLink(activeSession.mailOptions));
  } else {
    log.warn("There is no active session to load smtp info from.");
  }
});

module.exports = UserAdministration;

function addP2PLink(mailOptions) {
  mailOptions.text = `${mailOptions.text} \n\n Link: https://${config.getConfig().host}:${config.getConfig().port}/html/client.html`;
  return mailOptions;
}
