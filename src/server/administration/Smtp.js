const Promise     = require('bluebird');
const NodeMailer	= require("nodemailer");

var publisher, smtpTransport, activeSmtp;

function Smtp() { }

Smtp.prototype.initializeTransport = Promise.coroutine(function* (address, callback) {
	this.log.debug(`Smtp.initializeTransport for ${address}`);
	if(typeof Smtp.prototype.lazyInit === 'undefined') {
		publisher = yield this.factory.createRedisPublisher();
		Smtp.prototype.lazyInit = true;
	}

	if(address !== activeSmtp) {
		this.closeTrasporter();

		var result = yield publisher.publishAsync(Publisher.Enum.DATABASE, ['readSmtp', [address]]);
		var data = result[0];
		if(data) {
			this.log.debug("Found smtp options initializing transport");
			smtpTransport = NodeMailer.createTransport({
					service: data.smtpHost,
					auth: {
							user: data.smtpAddress,
							pass: data.smtpPassword
					}
			});
			activeSmtp = data.smtpAddress;
		}
	}
});

Smtp.prototype.createMailOptions = function(from, to, subject, text, html) {
	this.log.debug("Smtp.createMailOptions");
	var mailOptions 		= {};

	mailOptions.from 		= from;
	mailOptions.to 			= to;
	mailOptions.subject	= subject;
	mailOptions.text 		= text;
	mailOptions.html 		= html;

	return mailOptions;
};

Smtp.prototype.sendMail = function(mailOptions) {
	this.log.debug("Smtp.sendMail");
	if(smtpTransport) {
		smtpTransport.sendMail(mailOptions, function(error, response) {
	    if(error) {
	        this.log.error(error);
	    }

			this.log.info("Message sent: ", response);
		}.bind(this));
		return true;
	}.bind(this);
	return false;
};

Smtp.prototype.closeTrasporter = function() {
	if(smtpTransport) {
		this.log.debug("Smtp.closeTrasporter");
		smtpTransport.close();
		smtpTransport = null;
	}
};

module.exports = Smtp;
