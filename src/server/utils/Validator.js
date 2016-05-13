var validator 		= require('validator');
var	json_keys			= require('./JsonKeys');

function Validator(){
	this.debug = true;
};

Validator.prototype.sterilizeState = function(input) {
	var clean = {};

	clean[json_keys.COMMAND] 		= this.sterilizeCommand(input[json_keys.COMMAND]);
	clean[json_keys.TIMESTAMP] 	= validator.toFloat(input[json_keys.TIMESTAMP]);

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeCallback = function(input) {
	var clean = {};

	clean[json_keys.ID] 			= validator.toString(input[json_keys.ID]);
	clean[json_keys.COMMAND] 	= this.sterilizeCommand(input[json_keys.COMMAND]);

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeCommand = function(input) {
	var command = validator.toString(input);

	if(validator.equals(command, "play")){
		return "play";
	}else if(validator.equals(command, "pause")){
		return "pause";
	} else if(validator.equals(command, "pause-sync")){
		return "pause-sync";
	} else {
		return "";
	}
};

Validator.prototype.sterilizeSmtp = function(input) {
	var clean = {};

	clean[json_keys.SMTP_USER] = validator.toString(input[json_keys.SMTP_USER]);
	clean[json_keys.SMTP_PASS] = validator.toString(input[json_keys.SMTP_PASS]);
	clean[json_keys.SMTP_HOST] = validator.toString(input[json_keys.SMTP_HOST]);

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeContact = function(input) {
	var clean = {};

	clean[json_keys.EMAIL] 	= input[json_keys.EMAIL]; //TODO normalizing takes out periods find new way
	clean[json_keys.HANDLE] = validator.toString(input[json_keys.HANDLE]);

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeEmail = function(input) {
	var clean = {};
	var recipients = new Array();

	for (var key in input[json_keys.RECIPIENTS]){
		recipients[key] = (this.sterilize_contact(input[json_keys.RECIPIENTS][key]));
	}

	clean[json_keys.SUBJECT] 		= validator.toString(input[json_keys.SUBJECT]);
	clean[json_keys.MESSAGE] 		= validator.toString(input[json_keys.MESSAGE]);
	clean[json_keys.RECIPIENTS] = recipients;

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeUser = function(input) {
	var clean = {};

	clean[json_keys.EMAIL] 	= input[json_keys.EMAIL]; //TODO normalizing takes out periods find new way
	clean[json_keys.TOKEN] 	= validator.toString(input[json_keys.TOKEN]);

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeConfig = function(input) {
};

Validator.prototype.logDataCleaning = function(dirty_data, dirty_data){
	if(this.debug){
		console.log("dirty: ", dirty_data, "clean: ", dirty_data);
	}
};

Validator.prototype.sterilizeVideoInfo = function(input){
	console.log(input);
	return input;
};


module.exports = Validator;
