const Promise			= require('bluebird');
const Path				= require('path');
const Datastore		= require('nedb');

var db, log;

function NeDatabase(){
};

NeDatabase.prototype.initialize = function(force) {
	if(typeof NeDatabase.prototype.protoInit === 'undefined') {
		NeDatabase.prototype.protoInit = true;
		var config 			= this.factory.createConfig();
		var logManager  = this.factory.createLogManager();
		log             = logManager.getLog(logManager.LogEnum.DATABASE);
	}

	if(force === undefined ? typeof NeDatabase.prototype.stateInit === 'undefined' : force) {
		NeDatabase.prototype.stateInit = true;
		log.info(`Loading db from path ${Path.join(config.getAppDataDir(), 'database_inst')}`);
		db = new Datastore({ filename: Path.join(config.getAppDataDir(), 'database_inst'), autoload: true });
		db = Promise.promisifyAll(db);
	}
};

//Create Calls
NeDatabase.prototype.createSmtp = function(json){
	return createJson.call(this, json);
};

NeDatabase.prototype.createSession = function(json){
	return createJson.call(this, json);
};

NeDatabase.prototype.createCerts = function(json){
	return createJson.call(this, json);
};

//Read Calls
NeDatabase.prototype.readSmtp = function(address){
	var query = { smtpAddress : address };
	return readJson.call(this, query);
};

NeDatabase.prototype.readAllSmtp = function(){
	var query = { smtpAddress : { $exists: true } };
	return readJson.call(this, query);
};

NeDatabase.prototype.readSession = function(id){
	var query = { _id: id };
	return readJson.call(this, query);
};

NeDatabase.prototype.readAllSessions = function(){
	var query = { title: { $exists: true } };
	return readJson.call(this, query);
};

NeDatabase.prototype.readCerts = function(){
	var query = { pem : { $exists: true } };
	return readJson.call(this, query);
};

//Update Calls
NeDatabase.prototype.updateSmtp = function(id, json){
	var query = { _id : id };
	return updateJson.call(this, query, json);
};

NeDatabase.prototype.updateSession = function(id, json){
	var query = { _id: id };
	return updateJson.call(this, query, json);
};

//Delete Calls
NeDatabase.prototype.deleteSmtp = function(id){
	var query = { _id : id };
	var option = {};
	return deleteJson.call(this, query, option);
};

NeDatabase.prototype.deleteSession = function(id){
	var query = { _id: id };
	var option = {};
	return deleteJson.call(this, query, option);
};

NeDatabase.prototype.deleteCerts = function(date){
	var query = { expire: { $gt: date } };
	var option = { multi: true };
	return deleteJson.call(this, query, option);
};

module.exports = NeDatabase;

function createJson(json) {
	log.info("createJson", json);
	return db.insertAsync(json);
};

function readJson(query) {
	log.info("readJson", query);
	return db.findAsync(query);
};

function updateJson(query, json) {
	log.info("updateJson", query);
	return db.updateAsync(query, json);
};

function deleteJson(query, options) {
	log.info("removeJson", query);
	return db.removeAsync(query, options);
};
