var Smtp      = require('./Smtp');
var Session   = require('../utils/Session');
var Validator = require('../utils/Validator');

var smtp      = new Smtp();
var validator = new Validator();
var session   = new Session();

function SmtpController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching SmtpController");

  socket.on('smtp-invite', function() {
    if(session.isAdmin(socket.id) && session.getActiveSession() != null){
      console.log('smtp-invite');

      var sendInvitations = function(address) {
        smtp.sendMail(addP2PLink(session.getActiveSession().mailOptions));
      };

      smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
    }
  });
}

module.exports = SmtpController;

function addP2PLink(mailOptions) {
  console.log("adding Link");
  var message = mailOptions.text;
  mailOptions.text = message + " \n Link: http://" + session.getLocalIp() + "/html/client.html";
  return mailOptions;
}
