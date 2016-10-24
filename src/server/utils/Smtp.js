var NodeMailer	= require("nodemailer");
var NeDatabase	= require("../database/NeDatabase");

var database 			= new NeDatabase();
var smtpTransport = null;
var activeSmtp		= null;

function Smtp(){

};

Smtp.prototype.initializeTransport = function(address, callback) {
	console.log("Smtp.initializeTransport");
	if(!isTransportInitialized()) {
		if(address != activeSmtp) {
			this.closeTrasporter();

			var loadSmtpOptions = function(result) {
				var data = result[0];
				if(data != undefined && data != null) {
					if(data.type == "Custom") {
						//TODO: allow some basic custom smtp logic
					} else {
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
			}

			database.readSmtp(address, loadSmtpOptions);
		} else {
			callback();
		}
	}
};

Smtp.prototype.createMailOptions = function(from, to, subject, text, html) {
	console.log("Smtp.createMailOptions");
	var mailOptions 		= new Object();

	mailOptions.from 		= from;
	mailOptions.to 			= to;
	mailOptions.subject	= subject;
	mailOptions.text 		= text;
	mailOptions.html 		= html;

	return mailOptions;
};

Smtp.prototype.sendMail = function(mailOptions) {
	console.log("Smtp.sendMail");
	if(isTransportInitialized()) {
		smtpTransport.sendMail(mailOptions, function(error, response) {
		    if(error) {
		        console.log(error);
		    }

				console.log("Message sent: " + response);
		});
		return true;
	}
	return false;
};

Smtp.prototype.closeTrasporter = function() {
	if(isTransportInitialized()) {
		console.log("Smtp.closeTrasporter");
		smtpTransport.close();
		smtpTransport = null;
	}
};

module.exports = Smtp;

var isTransportInitialized = function() {
	return smtpTransport != null;
}
