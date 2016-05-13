var Smtp      = require('./Smtp');
var Validator = require('../utils/Validator');

var smtp      = new Smtp();
var validator = new Validator();

function SmtpController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching SmtpController");

  //Smtp Events
  socket.on('smtp-init', function (data) {
    if(socket.auth){
      console.log('smtp-init-creds');
      smtp.initialize(validator.sterilizeSmtp(data));
    }
  });

  socket.on('smtp-invite', function (data) {
    if(socket.auth){
      console.log('smtp-invite');
      smtp.build_and_send_invitations(validator.sterilizeEmail(data));
    }
  });
}

module.exports = SmtpController;
