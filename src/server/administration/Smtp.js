var NodeMailer	= require("nodemailer");
var LogManager  = require('../log/LogManager');
var Publisher   = require('../process/redis/RedisPublisher');

var log         = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var publisher, smtpTransport, activeSmtp;

function lazyInit() {
	publisher 		= new Publisher();
}

class Smtp{
	constructor() {
		if(typeof Smtp.prototype.lazyInit === 'undefined') {
			lazyInit();
			Smtp.prototype.lazyInit = true;
		}
	}
};

Smtp.prototype.initializeTransport = function(address, callback) {
	log.debug(`Smtp.initializeTransport for ${address}`);
	if(address !== activeSmtp) {
		this.closeTrasporter();

		var loadSmtpOptions = function(result) {
			var data = result[0];
			if(data !== undefined && data !== null) {
				log.debug("loadSmtpOptions found options initializing smtp");
				smtpTransport = NodeMailer.createTransport({
						service: data.smtpHost,
						auth: {
								user: data.smtpAddress,
								pass: data.smtpPassword
						}
				});
				activeSmtp = data.smtpAddress;
				callback();
			}
		}

		publisher.publish(Publisher.Enum.DATABASE, ['readSmtp', [address]], loadSmtpOptions);
	} else {
		callback();
	}
};

Smtp.prototype.createMailOptions = function(from, to, subject, text, html) {
	log.debug("Smtp.createMailOptions");
	var mailOptions 		= new Object();

	mailOptions.from 		= from;
	mailOptions.to 			= to;
	mailOptions.subject	= subject;
	mailOptions.text 		= text;
	mailOptions.html 		= html;

	return mailOptions;
};

Smtp.prototype.sendMail = function(mailOptions) {
	log.debug("Smtp.sendMail");
	if(isTransportInitialized()) {
		smtpTransport.sendMail(mailOptions, function(error, response) {
		    if(error) {
		        log.error(error);
		    }

				log.info("Message sent: ", response);
		});
		return true;
	}
	return false;
};

Smtp.prototype.closeTrasporter = function() {
	if(isTransportInitialized()) {
		log.debug("Smtp.closeTrasporter");
		smtpTransport.close();
		smtpTransport = null;
	}
};

module.exports = Smtp;

var isTransportInitialized = function() {
	return smtpTransport !== null && smtpTransport !== undefined;
}
