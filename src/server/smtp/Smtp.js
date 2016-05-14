var NodeMailer	= require("nodemailer");
var NeDatabase	= require("../database/NeDatabase");

var database 			= new NeDatabase();
var smtpTransport = null;

function Smtp(){

};

Smtp.prototype.initializeTransport = function(address, callback) {
	console.log("Smtp.initializeTransport");
	if(!isTransportInitialized() || address != smtpTransport.auth.user) {
		this.closeTrasporter();

		var loadSmtpOptions = function(data) {
			if(data.type == "SMTP") {
				smtpTransport = nodemailer.createTransport("SMTP",{
						service: data.service,
						auth: {
								user: data.address,
								pass: data.pass
						}
				});
			} else {
				smtpTransport = nodemailer.createTransport("direct", {
					debug: true
				});
			}

			callback(data.address);
		}

		database.readSmtp(address, loadSmtpOptions);
	}
	callback();
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
		    } else {
		    		console.log("Message sent: " + response.message);
		    }
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
