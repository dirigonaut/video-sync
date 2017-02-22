var validator 		= require('validator');
var	json_keys			= require('./definitions/JsonKeys');

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

	clean[json_keys.SMTP_TYPE]			= validator.toString(input[json_keys.SMTP_TYPE]);
	clean[json_keys.SMTP_HOST]			= validator.toString(input[json_keys.SMTP_HOST]);
	clean[json_keys.SMTP_ADDRESS]		= validator.toString(input[json_keys.SMTP_ADDRESS]);
	clean[json_keys.SMTP_PASSWORD]	= validator.toString(input[json_keys.SMTP_PASSWORD]);

	this.logDataCleaning(input, clean);
	return input;
};

Validator.prototype.sterilizeContact = function(input) {
	var clean = {};

	clean[json_keys.ADDRESS] 	= input[json_keys.ADDRESS]; //TODO normalizing takes out periods find new way
	clean[json_keys.HANDLE] = validator.toString(input[json_keys.HANDLE]);

	this.logDataCleaning(input, clean);
	return clean;
};

Validator.prototype.sterilizeSession = function(input) {
	var clean = {};
	var recipients = new Array();

	this.logDataCleaning(input, clean);
	return input;
};

Validator.prototype.sterilizeUser = function(input) {
	var clean = {};

	clean[json_keys.ADDRESS] 	= input[json_keys.ADDRESS]; //TODO normalizing takes out periods find new way
	clean[json_keys.TOKEN] 	= validator.toString(input[json_keys.TOKEN]);
	clean[json_keys.HANDLE] 	= validator.toString(input[json_keys.HANDLE]);

	this.logDataCleaning(input, clean);
	return clean;
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

Validator.prototype.sterilize = function(input){
	console.log(input);
	return input;
};

module.exports = Validator;
