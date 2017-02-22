var Path 				= require('path');
var Datastore 	= require('nedb');

var LogManager    = require('../log/LogManager');

var db;

var log = LogManager.getLog(LogManager.LogEnum.DATABASE);

function NeDatabase(){
};

NeDatabase.prototype.initialize = function(appData) {
	if((db === null || db === undefined) && appData !== undefined) {
		db = new Datastore({ filename: Path.join(appData, 'database_inst'), autoload: true });
	}
};

//Create Calls
NeDatabase.prototype.createSmtp = function(json, callback){
	createJson(json, callback);
};

NeDatabase.prototype.createContact = function(json, callback){
	createJson(json, callback);
};

NeDatabase.prototype.createSession = function(json, callback){
	createJson(json, callback);
};

NeDatabase.prototype.createToken = function(json, callback){
	createJson(json, callback);
};

NeDatabase.prototype.createCerts = function(json, callback){
	createJson(json, callback);
};

//Read Calls
NeDatabase.prototype.readSmtp = function(address, callback){
	var query = { smtpAddress : address };
	readJson(query, callback);
};

NeDatabase.prototype.readAllSmtp = function(callback){
	var query = { smtpAddress : { $exists: true } };
	readJson(query, callback);
};

NeDatabase.prototype.readAllContacts = function(callback){
	var query = { email: { $exists: true } }
	readJson(query, callback);
};

NeDatabase.prototype.readSession = function(id, callback){
	var query = { _id: id };
	readJson(query, callback);
};

NeDatabase.prototype.readAllSessions = function(callback){
	var query = { title: { $exists: true } };
	readJson(query, callback);
};

NeDatabase.prototype.readToken = function(address, token, callback){
	var query = { address : address, token : token };
	readJson(query, callback);
};

NeDatabase.prototype.readCerts = function(callback){
	var query = { pem : { $exists: true } };
	readJson(query, callback);
};

//Update Calls
NeDatabase.prototype.updateSmtp = function(id, json, callback){
	var query = { _id : id };
	updateJson(query, json, callback);
};

NeDatabase.prototype.updateContact = function(id, json, callback){
	var query = { _id: id };
	updateJson(query, json, callback);
};

NeDatabase.prototype.updateSession = function(id, json, callback){
	var query = { _id: id };
	updateJson(query, json, callback);
};

//Delete Calls
NeDatabase.prototype.deleteSmtp = function(id, callback){
	var query = { _id : id };
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteContact = function(id, callback){
	var query = { _id: id };
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteSession = function(id, callback){
	var query = { _id: id };
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteTokens = function(id, callback){
	var query = { _id: id };
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteCerts = function(date, callback){
	var query = { expire: { $gt: date } };
	var option = { multi: true };
	deleteJson(query, option, callback);
};

module.exports = NeDatabase;

function createJson(json, callback) {
	log.info("createJson", json);

	db.insert(json, function(err, newDoc){
		console.log(newDoc);
		if(callback) {
			callback(newDoc);
		}
	});
};

function readJson(query, callback) {
	log.info("readJson", query);

	db.find(query, function(err, docs){
		log.info(docs);
		if(callback) {
			callback(docs);
		}
	});
};

function updateJson(query, json, callback) {
	log.info("updateJson", query);

	db.update(query, json, function(err, docs){
		log.info(docs);
		if(callback) {
			callback(docs);
		}
	});
};

function deleteJson(query, options, callback) {
	log.info("removeJson", query);

	db.remove(query, options, function (err, removed) {
		log.info(removed);
		if(callback) {
			callback(removed);
		}
	});
};
