const Promise     = require('bluebird');
const NodeMailer	= require("nodemailer");

var publisher, smtpTransport, activeSmtp, log;

function Smtp() { }

Smtp.prototype.initialize = function() {
	if(typeof Smtp.prototype.protoInit === 'undefined') {
		Smtp.prototype.protoInit = true;

		publisher 			= this.factory.createRedisPublisher();

		var logManager  = this.factory.createLogManager();
		log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);
	}
};

Smtp.prototype.initializeTransport = Promise.coroutine(function* (address) {
	log.debug(`Smtp.initializeTransport for ${address}`);
	if(address !== activeSmtp) {
		this.closeTrasporter();

		var result = yield publisher.publishAsync(publisher.Enum.DATABASE, ['readSmtp', [address]]).then(function(data) {
	    return data[0];
	  });

		if(result) {
			log.debug("Found smtp options initializing transport");
			smtpTransport = NodeMailer.createTransport({
					service: result.smtpHost,
					auth: {
							user: result.smtpAddress,
							pass: result.smtpPassword
					}
			});
			activeSmtp = result.smtpAddress;
		}
	}
});

Smtp.prototype.createMailOptions = function(from, to, subject, text, html) {
	log.debug("Smtp.createMailOptions");
	var mailOptions 		= {};

	mailOptions.from 		= from;
	mailOptions.to 			= to;
	mailOptions.subject	= subject;
	mailOptions.text 		= text;
	mailOptions.html 		= html;

	return mailOptions;
};

Smtp.prototype.sendMail = function(mailOptions) {
	log.debug("Smtp.sendMail");
	if(smtpTransport) {
		smtpTransport.sendMail(mailOptions, function(error, response) {
	    if(error) {
	        log.error(error);
	    }

			log.info("Message sent: ", response);
		});
		return true;
	};
	return false;
};

Smtp.prototype.closeTrasporter = function() {
	if(smtpTransport) {
		log.debug("Smtp.closeTrasporter");
		smtpTransport.close();
		smtpTransport = null;
	}
};

module.exports = Smtp;
