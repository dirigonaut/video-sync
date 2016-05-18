var Datastore 	= require('nedb');
var	JsonKeys		= require('../utils/JsonKeys');

var db = new Datastore({ filename: './data/database_inst', autoload: true });

function NeDatabase(){

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

//Read Calls
NeDatabase.prototype.readSmtp = function(address, callback){
	var query = { smtpProfile : address };
	readJson(query, callback);
};

NeDatabase.prototype.readAllSmtp = function(callback){
	var query = { smtpProfile : { $exists: true } };
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

NeDatabase.prototype.readAllSessions = function(id, callback){
	var query = { sessionProfile: { $exists: true } };
	readJson(query, callback);
};

NeDatabase.prototype.readToken = function(id, callback){
	var query = { _id: id };
	readJson(query, callback);
};

//Update Calls
NeDatabase.prototype.updateSmtp = function(address, callback){
	var query = { smtpProfile : address };
	var json	= "";
	updateJson(query, json, callback);
};

NeDatabase.prototype.updateContact = function(callback){
	var query = { email: { $exists: true } }
	var json	= "";
	updateJson(query, json, callback);
};

NeDatabase.prototype.updateSession = function(id, callback){
	var query = { sessionProfile: id };
	var json	= "";
	updateJson(query, json, callback);
};

//Delete Calls
NeDatabase.prototype.deleteSmtp = function(callback){
	var query = { smtpProfile : { $exists: true } };
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteContact = function(callback){
	var query = { email: { $exists: true } }
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteSession = function(id, callback){
	var query = { sessionProfile: id };
	var option = {};
	deleteJson(query, option, callback);
};

NeDatabase.prototype.deleteTokens = function(id, callback){
	var query = { _id: id };
	var option = {};
	deleteJson(query, option, callback);
};

module.exports = NeDatabase;

function createJson(json, callback) {
	console.log("createJson", json);

	db.insert(json, function(err, newDoc){
		console.log(newDoc);
		if(callback) {
			callback(newDoc);
		}
	});
};

function readJson(query, callback) {
	console.log("readJson", query);

	db.find(query, function(err, docs){
		console.log(docs);
		if(callback) {
			callback(docs);
		}
	});
};

function updateJson(query, json, callback) {
	console.log("updateJson", query);

	db.update(query, json, function(err, docs){
		console.log(docs);
		if(callback) {
			callback(docs);
		}
	});
};

function deleteJson(query, options, callback) {
	console.log("removeJson", query);

	db.remove(query, options, function (err, removed) {
		console.log(removed);
		if(callback) {
			callback(removed);
		}
	});
};
